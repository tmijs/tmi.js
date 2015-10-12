var api = require("./api");
var commands = require("./commands");
var cron = require("cron");
var eventEmitter = require("events").EventEmitter;
var locallydb = require("locallydb");
var logger = require("./logger");
var parse = require("irc-message").parse;
var server = require("./server");
var timer = require("./timer");
var util = require("util");
var utils = require("./utils");
var webSocket = require("ws");
var _ = require("underscore");

// Polyfill for indexOf() -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf#Compatibility
// This algorithm matches the one specified in ECMA-262, 5th edition, assuming TypeError and Math.abs() have their original values.
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
        var k;

        if (this == null) { throw new TypeError("\"this\" is null or not defined"); }

        var O = Object(this);
        var len = O.length >>> 0;

        if (len === 0) { return -1; }

        var n = +fromIndex || 0;

        if (Math.abs(n) === Infinity) { n = 0; }
        if (n >= len) { return -1; }

        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        while (k < len) {
            if (k in O && O[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}

// Polyfill for includes() -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
if (!String.prototype.includes) {
    String.prototype.includes = function() {'use strict';
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    };
}

// Polyfill for startsWith() -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

// Client instance..
var client = function client(opts) {
    if (this instanceof client === false) { return new client(opts); }
    this.setMaxListeners(0);

    this.opts = typeof opts === "undefined" ? {} : opts;
    this.opts.channels = this.opts.channels || [];
    this.opts.connection = this.opts.connection || {};
    this.opts.identity = this.opts.identity || {};
    this.opts.options = this.opts.options || {};

    this.channels = [];
    this.globaluserstate = {};
    this.lastJoined = "";
    this.latency = new Date();
    this.moderators = {};
    this.pingLoop = null;
    this.pingTimeout = null;
    this.reconnectTimer = 0;
    this.username = "";
    this.userstate = {};
    this.wasCloseCalled = false;
    this.ws = null;
    this.reconnecting = false;

    this.banError = "";

    this.eventMods = [];

    // Create the logger..
    var level = "error";
    if (this.opts.options.debug) {
        // Show debug messages
        level = "info";
    }
    this.log = this.opts.logger || logger.createLogger("tmi.js", level, "raw");

    // Format the channel names..
    this.opts.channels.forEach(function(part, index, theArray) {
        theArray[index] = utils.normalizeChannel(part);
    });

    eventEmitter.call(this);
}

util.inherits(client, eventEmitter);

client.prototype.api = api;

// Put all commands in prototype..
for(var methodName in commands) {
    client.prototype[methodName] = commands[methodName];
}

client.prototype.def = function def(varName, onChange) {
    var _value;

    Object.defineProperty(this, varName, {
        get: function() {
            return _value;
        },
        set: function(value) {
            if (onChange) { onChange(_value, value); }
            _value = value;
        }
    });

    return this[varName];
}

// Handle parsed chat server message..
client.prototype.handleMessage = function handleMessage(message) {
    if (message !== null) {
        // Parse emotes..
        if (_.isString(message.tags["emotes"])) {
            var emoticons = message.tags["emotes"].split("/");
            var emotes = {};

            for (var i = 0; i < emoticons.length; i++) {
                var parts = emoticons[i].split(":");
                emotes[parts[0]] = parts[1].split(",");
            }
            message.tags["emotes-raw"] = message.tags["emotes"];
            message.tags["emotes"] = emotes;
        }
        if (_.isBoolean(message.tags["emotes"])) { message.tags["emotes-raw"] = null; }

        // Transform the IRCv3 tags..
        if (message.tags) {
            for(var key in message.tags) {
                if (key !== "emote-sets") {
                    if (_.isBoolean(message.tags[key])) { message.tags[key] = null; }
                    else if (message.tags[key] === "1") { message.tags[key] = true; }
                    else if (message.tags[key] === "0") { message.tags[key] = false; }
                }
            }
        }

        // Messages with no prefix..
        if (_.isNull(message.prefix)) {
            switch(message.command) {
                // Received PING from server..
                case "PING":
                    this.emit("ping");
                    this.ws.send("PONG");
                    break;

                // Received PONG from server, return current latency
                case "PONG":
                    var currDate = new Date();
                    var latency = (currDate.getTime() - this.latency.getTime()) / 1000;
                    this.emit("pong", latency);

                    clearTimeout(this.pingTimeout);
                    break;

                default:
                    this.log.warn(`Could not parse message with no prefix:\n${message.raw}`);
                    break;
            }
        }

        // Messages with "tmi.twitch.tv" as a prefix..
        else if (message.prefix === "tmi.twitch.tv") {
            switch(message.command) {
                case "002":
                case "003":
                case "004":
                case "375":
                case "376":
                case "CAP":
                    break;

                // Got username from server..
                case "001":
                    this.username = message.params[0];
                    break;

                // Connected to server..
                case "372":
                    this.log.info("Connected to server.");
                    this.userstate["#jtv"] = {};
                    this.emit("connected", this.server, this.port);
                    this.reconnectTimer = 0;

                    this.pingLoop = setInterval(() => {
                        if (!_.isNull(this.ws) && this.ws.readyState !== 2 && this.ws.readyState !== 3) {
                            this.ws.send("PING");
                        }
                        this.latency = new Date();
                        this.pingTimeout = setTimeout(() => {
                            if (!_.isNull(this.ws)) {
                                this.wasCloseCalled = false;
                                this.log.error("Ping timeout.");
                                this.ws.close();

                                clearInterval(this.pingLoop);
                                clearTimeout(this.pingTimeout);
                            }
                        }, typeof this.opts.connection.timeout === "undefined" ? 9999 : this.opts.connection.timeout);
                    }, 60000);

                    // Join all the channels from configuration every 2 seconds..
                    var joinQueue = new timer.queue(2000);

                    var joinChannels = _.union(this.opts.channels, this.channels);
                    this.channels = [];
                    
                    if (joinChannels.length >= 75) {
                        this.log.warn("You are joining a large amount of channels, you might get disconnected from server if you receive too much data.");
                        this.log.warn("Consider creating multiple connections or use Node.js clusters.");
                    }

                    for (var i = 0; i < joinChannels.length; i++) {
                        var self = this;
                        joinQueue.add(function(i) {
                            if (!_.isNull(self.ws) && self.ws.readyState !== 2 && self.ws.readyState !== 3) {
                                self.ws.send("JOIN " + utils.normalizeChannel(joinChannels[i]));
                            }
                        }.bind(this, i))
                    }

                    joinQueue.run();
                    break;

                // https://github.com/justintv/Twitch-API/blob/master/chat/capabilities.md#notice
                case "NOTICE":
                    var msgid = message.tags["msg-id"] || null;

                    switch(msgid) {
                        // This room is now in subscribers-only mode.
                        case "subs_on":
                            this.log.info(`[${message.params[0]}] This room is now in subscribers-only mode.`);
                            this.emit("subscriber", message.params[0], true);
                            this.emit("subscribers", message.params[0], true);
                            break;

                        // This room is no longer in subscribers-only mode.
                        case "subs_off":
                            this.log.info(`[${message.params[0]}] This room is no longer in subscribers-only mode.`);
                            this.emit("subscriber", message.params[0], false);
                            this.emit("subscribers", message.params[0], false);
                            break;

                        // Moved to ROOMSTATE.
                        case "slow_on":
                        case "slow_off":
                            break;

                        // This room is now in r9k mode.
                        case "r9k_on":
                            this.log.info(`[${message.params[0]}] This room is now in r9k mode.`);
                            this.emit("r9kmode", message.params[0], true);
                            this.emit("r9kbeta", message.params[0], true);
                            break;

                        // This room is no longer in r9k mode.
                        case "r9k_off":
                            this.log.info(`[${message.params[0]}] This room is no longer in r9k mode.`);
                            this.emit("r9kmode", message.params[0], false);
                            this.emit("r9kbeta", message.params[0], false);
                            break;

                        // The moderators of this room are [...]
                        case "room_mods":
                            var splitted = message.params[1].split(":");
                            var mods = splitted[1].replace(/,/g, "").split(":").toString().toLowerCase().split(" ");

                            for(var i = mods.length - 1; i >= 0; i--) {
                                if(mods[i] === "") {
                                    mods.splice(i, 1);
                                }
                            }

                            this.eventMods = mods;

                            this.emit("mods", message.params[0], mods);
                            break;

                        // There are no moderators for this room.
                        case "no_mods":
                            this.eventMods = [];
                            break;

                        case "already_banned":
                        case "bad_ban_admin":
                        case "bad_ban_broadcaster":
                        case "bad_ban_global_mod":
                        case "bad_ban_self":
                        case "bad_ban_staff":
                        case "bad_mod_banned":
                        case "usage_ban":
                            this.banError = message.tags["msg-id"];
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            break;

                        case "ban_success":
                            this.banError = "";
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            break;

                        // Send the following msg-ids to the notice event listener..
                        case "already_subs_off":
                        case "bad_commercial_error":
                        case "bad_timeout_admin":
                        case "bad_timeout_broadcaster":
                        case "bad_timeout_global_mod":
                        case "bad_timeout_self":
                        case "bad_timeout_staff":
                        case "bad_unban_no_ban":
                        case "cmds_available":
                        case "color_changed":
                        case "commercial_success":
                        case "hosts_remaining":
                        case "host_target_went_offline":
                        case "msg_banned":
                        case "msg_duplicate":
                        case "msg_verified_email":
                        case "msg_ratelimit":
                        case "msg_subsonly":
                        case "msg_timedout":
                        case "no_help":
                        case "no_permission":
                        case "timeout_success":
                        case "unban_success":
                        case "unrecognized_cmd":
                        case "usage_clear":
                        case "usage_color":
                        case "usage_commercial":
                        case "usage_disconnect":
                        case "usage_help":
                        case "usage_host":
                        case "usage_me":
                        case "usage_mod":
                        case "usage_mods":
                        case "usage_r9k_on":
                        case "usage_r9k_off":
                        case "usage_slow_on":
                        case "usage_slow_off":
                        case "usage_subs_on":
                        case "usage_subs_off":
                        case "usage_timeout":
                        case "usage_unban":
                        case "usage_unhost":
                        case "usage_unmod":
                        case "whisper_invalid_self":
                        case "whisper_limit_per_min":
                        case "whisper_limit_per_sec":
                        case "whisper_restricted_recipient":
                          this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                          this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                          break;

                        // Ignore this because we are already listening to HOSTTARGET.
                        case "host_on":
                        case "host_off":
                            //
                            break;

                        default:
                            if (message.params[1].includes("Login unsuccessful")) {
                                this.wasCloseCalled = true;
                                this.log.error("Login unsuccessful.");
                                this.ws.close();
                            }
                            else if (message.params[1].includes("Error logging in")) {
                                this.wasCloseCalled = true;
                                this.log.error("Error logging in.");
                                this.ws.close();
                            }
                            else if (message.params[1].includes("Invalid NICK")) {
                                this.wasCloseCalled = true;
                                this.log.error("Invalid NICK.");
                                this.ws.close();
                            }
                            else {
                                this.log.warn(`Could not parse NOTICE from tmi.twitch.tv:\n${message}`);
                            }
                            break;
                    }
                    break;

                // Channel is now hosting another channel or exited host mode..
                case "HOSTTARGET":
                    // Stopped hosting..
                    if (message.params[1].split(" ")[0] === "-") {
                        this.log.info(`[${message.params[0]}] Exited host mode.`);
                        this.emit("unhost", message.params[0], message.params[1].split(" ")[1] || "0");
                    }
                    // Now hosting..
                    else {
                        var viewers = message.params[1].split(" ")[1] || 0;
                        if (!utils.isInteger(viewers)) { viewers = 0; }

                        this.log.info(`[${message.params[0]}] Now hosting ${message.params[1].split(" ")[0]} for ${viewers} viewer(s).`);
                        this.emit("hosting", message.params[0], message.params[1].split(" ")[0], viewers);
                    }
                    break;

                // Someone has been timed out or chat has been cleared by a moderator..
                case "CLEARCHAT":
                    // User has been timed out by a moderator..
                    if (message.params.length > 1) {
                        this.log.info(`[${message.params[0]}] ${message.params[1]} has been timed out.`);
                        this.emit("timeout", message.params[0], message.params[1]);
                    }
                    // Chat was cleared by a moderator..
                    else {
                        this.log.info(`[${message.params[0]}] Chat was cleared by a moderator.`);
                        this.emit("clearchat", message.params[0]);
                    }
                    break;

                case "RECONNECT":
                    this.log.info("Received RECONNECT request from Twitch..");
                    this.log.info(`Disconnecting and reconnecting in ${this.reconnectTimer / 1000} seconds..`);
                    this.disconnect();
                    setTimeout(() => { this.connect(); }, this.reconnectTimer);
                    break;

                // Received when joining a channel and every time you send a PRIVMSG to a channel.
                case "USERSTATE":
                    message.tags.username = this.username;
                    // Add the client to the moderators of this room..
                    if (message.tags["user-type"] === "mod") {
                        if (!this.moderators[this.lastJoined]) { this.moderators[this.lastJoined] = []; }
                        if (this.moderators[this.lastJoined].indexOf(this.username) < 0) { this.moderators[this.lastJoined].push(this.username); }
                    }

                    if (!this.getUsername().includes("justinfan") && !this.userstate[utils.normalizeChannel(message.params[0])]) {
                        this.userstate[message.params[0]] = message.tags;
                        this.lastJoined = message.params[0];
                        this.channels.push(message.params[0]);
                        this.log.info("Joined " + message.params[0]);
                        this.emit("join", message.params[0], utils.normalizeUsername(this.getUsername()));
                    }

                    this.userstate[message.params[0]] = message.tags;
                    break;

                // Describe non-channel-specific state informations.
                case "GLOBALUSERSTATE":
                    this.globaluserstate = message.tags;

                    if (typeof message.tags["emote-sets"] !== "undefined") {
                        this.emit("emotesets", message.tags["emote-sets"]);
                    }
                    break;

                case "ROOMSTATE":
                    message.tags.channel = this.lastJoined;
                    this.emit("roomstate", message.params[0], message.tags);

                    // This room is now in slow mode. You may send messages every slow_duration seconds.
                    if (message.tags.hasOwnProperty("slow") && !message.tags.hasOwnProperty("subs-only")) {
                        if (typeof message.tags.slow === "boolean") {
                            this.log.info(`[${message.params[0]}] This room is no longer in slow mode.`);
                            this.emit("slow", message.params[0], false, "0");
                            this.emit("slowmode", message.params[0], false, "0");
                        } else {
                            this.log.info(`[${message.params[0]}] This room is now in slow mode.`);
                            this.emit("slow", message.params[0], true, message.tags.slow);
                            this.emit("slowmode", message.params[0], true, message.tags.slow);
                        }
                    }
                    break;

                default:
                    this.log.warn(`Could not parse message from tmi.twitch.tv:\n${message}`);
                    break;
            }
        }

        // Messages from jtv..
        else if (message.prefix === "jtv") {
            switch(message.command) {
                case "MODE":
                    if (message.params[1] === "+o") {
                        // Add username to the moderators..
                        if (!this.moderators[message.params[0]]) { this.moderators[message.params[0]] = []; }
                        if (this.moderators[message.params[0]].indexOf(message.params[2]) < 0) { this.moderators[message.params[0]].push(message.params[2]); }

                        this.emit("mod", message.params[0], message.params[2]);
                    }
                    else if (message.params[1] === "-o") {
                        // Remove username from the moderators..
                        if (!this.moderators[message.params[0]]) { this.moderators[message.params[0]] = []; }
                        this.moderators[message.params[0]].filter((value) => { return value != message.params[2]; });

                        this.emit("unmod", message.params[0], message.params[2]);
                    }
                    break;

                default:
                    this.log.warn(`Could not parse message from jtv:\n${message}`);
                    break;
            }
        }

        // Anything else..
        else {
            switch(message.command) {
                case "353":
                    this.emit("names", message.params[2], message.params[3].split(" "));
                    break;

                case "366":
                    break;

                case "JOIN":
                    if (this.getUsername().includes("justinfan") && this.username === message.prefix.split("!")[0]) {
                        this.lastJoined = message.params[0];
                        this.channels.push(message.params[0]);
                        this.log.info(`Joined ${message.params[0]}`);
                        this.emit("join", message.params[0], message.prefix.split("!")[0]);
                    }

                    if (this.username !== message.prefix.split("!")[0]) {
                        this.emit("join", message.params[0], message.prefix.split("!")[0]);
                    }

                    break;

                case "PART":
                    if (this.username === message.prefix.split("!")[0]) {
                        if (this.userstate[message.params[0]]) { delete this.userstate[message.params[0]]; }
                        var index = this.channels.indexOf(message.params[0]);
                        if (index !== -1) { this.channels.splice(index, 1); }
                        this.log.info(`Left ${message.params[0]}`);
                    }
                    this.emit("part", message.params[0], message.prefix.split("!")[0]);
                    break;

                case "WHISPER":
                    this.log.info(`[WHISPER] <${message.prefix.split("!")[0]}>: ${message.params[1]}`);
                    this.emit("whisper", message.prefix.split("!")[0], message.params[1]);

                    var whisperTags = {
                        username: message.prefix.split("!")[0],
                        "message-type": "whisper"
                    }
                    this.emit("message", null, whisperTags, message.params[1], false);
                    break;

                case "PRIVMSG":
                    // Add username (lowercase) to the tags..
                    message.tags.username = message.prefix.split("!")[0];

                    // Message from TwitchNotify..
                    if (message.tags.username === "twitchnotify") {
                        // Someone subscribed to a hosted channel. Who cares.
                        if (message.params[1].includes("subscribed to")) {
                            //
                        }
                        // New subscriber..
                        else if (message.params[1].includes("just subscribed")) {
                            this.emit("subscription", message.params[0], message.params[1].split(" ")[0]);
                        }
                        // Subanniversary..
                        else if (message.params[1].includes("subscribed") && message.params[1].includes("in a row")) {
                            var splitted = message.params[1].split(" ");
                            var length = splitted[splitted.length - 5];

                            this.emit("subanniversary", message.params[0], splitted[0], length);
                        }
                    }

                    // Message from JTV..
                    else if (message.tags.username === "jtv") {
                        // Someone is hosting my channel..
                        if (message.params[1].includes("is now hosting you for")) {
                            this.emit("hosted", message.params[0], utils.normalizeUsername(message.params[1].split(" ")[0]), message.params[1].split(" ")[6]);
                        }
                        else if (message.params[1].includes("is now hosting you")) {
                            this.emit("hosted", message.params[0], utils.normalizeUsername(message.params[1].split(" ")[0]), 0);
                        }
                    }

                    else {
                        // Message is an action..
                        if (message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                            message.tags["message-type"] = "action";
                            this.log.info(`[${message.params[0]}] *<${message.tags.username}>: ${message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]}`);
                            this.emit("action", message.params[0], message.tags, message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], false);
                            this.emit("message", message.params[0], message.tags, message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], false);
                        }
                        // Message is a regular message..
                        else {
                            message.tags["message-type"] = "chat";
                            this.log.info(`[${message.params[0]}] <${message.tags.username}>: ${message.params[1]}`);
                            this.emit("chat", message.params[0], message.tags, message.params[1], false);
                            this.emit("message", message.params[0], message.tags, message.params[1], false);
                        }
                    }
                    break;

                default:
                    this.log.warn(`Could not parse message:\n${message}`);
                    break;
            }
        }
    }
};

// Connect to server..
client.prototype.connect = function connect() {
    return new Promise((resolve, reject) => {
        this.reconnect = typeof this.opts.connection.reconnect === "undefined" ? false : this.opts.connection.reconnect;
        this.server = typeof this.opts.connection.server === "undefined" ? "RANDOM" : this.opts.connection.server;
        this.port = typeof this.opts.connection.port === "undefined" ? 443 : this.opts.connection.port;
        this.reconnectTimer = this.reconnectTimer + 10000;
        if (this.reconnectTimer >= 60000) {
            this.reconnectTimer = 60000;
        }

        // Connect to a random server..
        if (this.server === "RANDOM" || typeof this.opts.connection.random !== "undefined") {
            // Default type is "chat" server..
            server.getRandomServer(typeof this.opts.connection.random === "undefined" ? "chat" : this.opts.connection.random, (addr) => {
                this.server = addr.split(":")[0];
                this.port = addr.split(":")[1];

                this._openConnection();
                resolve([this.server, this.port]);
            });
        }
        // Connect to server from configuration..
        else {
            this._openConnection();
            resolve([this.server, this.port]);
        }
    });
};

// Open a connection..
client.prototype._openConnection = function _openConnection() {
    server.isWebSocket(this.server, this.port, (accepts) => {
        // Server is accepting WebSocket connections..
        if (accepts) {
            this.ws = new webSocket("ws://" + this.server + ":" + this.port + "/", "irc");

            this.ws.onmessage = this._onMessage.bind(this);
            this.ws.onerror = this._onError.bind(this);
            this.ws.onclose = this._onClose.bind(this);
            this.ws.onopen = this._onOpen.bind(this);
        }
        // Server is not accepting WebSocket connections..
        else {
            this.emit("disconnected", "Sorry, we were unable to connect to chat.");
            if (this.reconnect && !this.reconnecting) {
                this.reconnecting = true;
                this.log.error(`Could not connect to server. Trying to reconnect in ${this.reconnectTimer / 1000} seconds..`);
                this.emit("reconnect");

                setTimeout(() => { this.reconnecting = false; this.connect(); }, this.reconnectTimer);
            } else {
                if (!this.reconnecting) { this.log.error("Could not connect to server."); }
            }
        }
    });
};

// Called when the WebSocket connection's readyState changes to OPEN.
// Indicates that the connection is ready to send and receive data..
client.prototype._onOpen = function _onOpen() {
    if (!_.isNull(this.ws) && this.ws.readyState === 1) {
        // Emitting "connecting" event..
        this.log.info(`Connecting to ${this.server} on port ${this.port}..`);
        this.emit("connecting", this.server, this.port);

        this.username = typeof this.opts.identity.username === "undefined" ? utils.generateJustinfan() : this.opts.identity.username;
        this.password = typeof this.opts.identity.password === "undefined" ? "SCHMOOPIIE": this.opts.identity.password;

        // Make sure "oauth:" is included..
        if (this.password !== "SCHMOOPIIE") {
            this.password = utils.normalizePassword(this.password);
        }

        // Emitting "logon" event..
        this.log.info("Sending authentication to server..");
        this.emit("logon");

        // Authentication..
        this.ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
        this.ws.send(`PASS ${this.password}`);
        this.ws.send(`NICK ${this.username}`);
        this.ws.send(`USER ${this.username} 8 * :${this.username}`);
    }
};

// Called when a message is received from the server..
client.prototype._onMessage = function _onMessage(event) {
    var parts = event.data.split("\r\n");

    parts.forEach((line) => {
        if (line !== null) {
            this.handleMessage(parse(line));
        }
    });
};

// Called when an error occurs..
client.prototype._onError = function _onError() {
    this.moderators = {};
    this.userstate = {};
    this.globaluserstate = {};

    clearInterval(this.pingLoop);
    clearTimeout(this.pingTimeout);

    if (!_.isNull(this.ws)) {
        this.log.error("Unable to connect.");
        this.emit("disconnected", "Unable to connect.");
    } else {
        this.log.error("Connection closed.");
        this.emit("disconnected", "Connection closed.");
    }

    this.ws = null;
};

// Called when the WebSocket connection's readyState changes to CLOSED..
client.prototype._onClose = function _onClose() {
    this.moderators = {};
    this.userstate = {};
    this.globaluserstate = {};

    clearInterval(this.pingLoop);
    clearTimeout(this.pingTimeout);

    // User called .disconnect();
    if (this.wasCloseCalled) {
        this.wasCloseCalled = false;
        this.log.info("Connection closed.");
        this.emit("disconnected", "Connection closed.");
    }
    // Got disconnected from server..
    else {
        this.emit("disconnected", "Unable to connect to chat.");

        if (this.reconnect && !this.reconnecting) {
            this.reconnecting = true;
            this.log.error(`Could not connect to server. Trying to reconnect in ${this.reconnectTimer / 1000} seconds..`);
            this.emit("reconnect");
            setTimeout(() => { this.reconnecting = false; this.connect(); }, this.reconnectTimer);
        } else {
            if (!this.reconnecting) { this.log.error("Sorry, we were unable to connect to chat."); }
        }
    }

    this.ws = null;
};

// Send a command to the server..
client.prototype._sendCommand = function _sendCommand(channel, command) {
    // Promise a result..
    return new Promise((resolve, reject) => {
        if (!_.isNull(this.ws) && this.ws.readyState !== 2 && this.ws.readyState !== 3) {
            switch (command.toLowerCase()) {
                case "/mods":
                case ".mods":
                    this.log.info(`Executing command: ${command}`);
                    this.def("eventMods", (oldValue, newValue) => {
                        newValue.forEach((username) => {
                            if (!this.moderators[channel]) { this.moderators[channel] = []; }
                            if (this.moderators[channel].indexOf(username) < 0) { this.moderators[channel].push(username); }
                        });
                        resolve(newValue);
                    });
                    this.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + command);
                    break;
                default:
                    if (!_.isNull(channel)) {
                        this.log.info(`[${utils.normalizeChannel(channel)}] Executing command: ${command}`);
                        this.ws.send(`PRIVMSG ${utils.normalizeChannel(channel)} :${command}`);
                    } else {
                        this.log.info(`Executing command: ${command}`);
                        this.ws.send(command);
                        if (command === "PING") {
                            this.latency = new Date();
                            this.pingTimeout = setTimeout(() => {
                                if (!_.isNull(this.ws)) {
                                    this.wasCloseCalled = false;
                                    this.log.error("Ping timeout.");
                                    this.ws.close();

                                    clearInterval(this.pingLoop);
                                    clearTimeout(this.pingTimeout);
                                }
                            }, typeof this.opts.connection.timeout === "undefined" ? 9999 : this.opts.connection.timeout);
                        }
                    }
                    resolve();
                    break;
            }
        } else {
            reject();
        }
    });
};

// Send a message to the server..
client.prototype._sendMessage = function _sendMessage(channel, message) {
    // Promise a result..
    return new Promise((resolve, reject) => {
        if (!_.isNull(this.ws) && this.ws.readyState !== 2 && this.ws.readyState !== 3 && !this.getUsername().includes("justinfan")) {
            if (!this.userstate[utils.normalizeChannel(channel)]) {
                this.userstate[utils.normalizeChannel(channel)] = {}
            }

            if (message.length >= 500) {
                var msg = utils.splitLine(message, 500);
                message = msg[0];

                msg.shift();
                setTimeout(() => {
                    this._sendMessage(channel, msg.join());
                }, 350);
            }

            this.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + message);

            if (message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                this.userstate[utils.normalizeChannel(channel)]["message-type"] = "action";
                this.log.info(`[${utils.normalizeChannel(channel)}] *<${this.getUsername()}>: ${message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]}`);
                this.emit("action", utils.normalizeChannel(channel), this.userstate[utils.normalizeChannel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], true);
                this.emit("message", utils.normalizeChannel(channel), this.userstate[utils.normalizeChannel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], true);
            }
            else {
                this.userstate[utils.normalizeChannel(channel)]["message-type"] = "chat";
                this.log.info(`[${utils.normalizeChannel(channel)}] <${this.getUsername()}>: ${message}`);
                this.emit("chat", utils.normalizeChannel(channel), this.userstate[utils.normalizeChannel(channel)], message, true);
                this.emit("message", utils.normalizeChannel(channel), this.userstate[utils.normalizeChannel(channel)], message, true);
            }
            resolve();
        } else {
            reject();
        }
    });
};

// Get current username..
client.prototype.getUsername = function getUsername() {
    return this.username;
};

// Get current options..
client.prototype.getOptions = function getOptions() {
    return this.opts;
};

// Get current channels..
client.prototype.getChannels = function getChannels() {
    return this.channels;
};

// Check if username is a moderator on a channel..
client.prototype.isMod = function isMod(channel, username) {
    if (!this.moderators[utils.normalizeChannel(channel)]) { this.moderators[utils.normalizeChannel(channel)] = []; }
    if (this.moderators[utils.normalizeChannel(channel)].indexOf(utils.normalizeUsername(username)) >= 0) {
        return true;
    }
    return false;
};

// Get readyState..
client.prototype.readyState = function readyState() {
    if (_.isNull(this.ws)) { return "CLOSED"; }
    return ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][this.ws.readyState];
};

// Disconnect from server..
client.prototype.disconnect = function disconnect() {
    return new Promise((resolve, reject) => {
        if (!_.isNull(this.ws) && this.ws.readyState !== 3) {
            this.wasCloseCalled = true;
            this.log.info("Disconnecting from server..");
            this.ws.close();
            resolve();
        } else {
            this.log.error("Cannot disconnect from server. Socket is not opened or connection is already closing.");
            reject();
        }
    });
};

client.prototype.utils = {
    cronjobs: function cronjobs(time, fn) {
        return new cron.CronJob(time, function () {
            fn();
        }, null, false);
    },
    levenshtein: function levenshtein(s1, s2, caseSensitive) {
        var cost_ins = 1;
        var cost_rep = 1;
        var cost_del = 1;
        caseSensitive = typeof caseSensitive === "undefined" ? false : caseSensitive;

        if (!caseSensitive) {
            s1 = s1.toLowerCase();
            s2 = s2.toLowerCase();
        }

        if (s1 == s2) { return 0; }

        var l1 = s1.length;
        var l2 = s2.length;

        if (l1 === 0) { return l2 * cost_ins; }
        if (l2 === 0) { return l1 * cost_del; }

        var split = false;
        try {
            split = !("0")[0];
        } catch (e) {
            split = true;
        }
        if (split) {
            s1 = s1.split("");
            s2 = s2.split("");
        }

        var p1 = new Array(l2 + 1);
        var p2 = new Array(l2 + 1);

        var i1, i2, c0, c1, c2, tmp;

        for (i2 = 0; i2 <= l2; i2++) {
            p1[i2] = i2 * cost_ins;
        }

        for (i1 = 0; i1 < l1; i1++) {
            p2[0] = p1[0] + cost_del;

            for (i2 = 0; i2 < l2; i2++) {
                c0 = p1[i2] + ((s1[i1] == s2[i2]) ? 0 : cost_rep);
                c1 = p1[i2 + 1] + cost_del;

                if (c1 < c0) {
                    c0 = c1;
                }

                c2 = p2[i2] + cost_ins;

                if (c2 < c0) {
                    c0 = c2;
                }

                p2[i2 + 1] = c0;
            }

            tmp = p1;
            p1 = p2;
            p2 = tmp;
        }

        c0 = p1[l2];

        return c0;
    },
    raffle: {
        init: function init(channel) {
            if (!this.raffleChannels) { this.raffleChannels = {}; }
            if (!this.raffleChannels[utils.normalizeChannel(channel)]) { this.raffleChannels[utils.normalizeChannel(channel)] = []; }
        },
        enter: function enter(channel, username) {
            this.init(channel);
            this.raffleChannels[utils.normalizeChannel(channel)].push(username.toLowerCase());
        },
        leave: function leave(channel, username) {
            this.init(channel);
            var index = this.raffleChannels[utils.normalizeChannel(channel)].indexOf(utils.normalizeUsername(username));
            if (index >= 0) {
                this.raffleChannels[utils.normalizeChannel(channel)].splice(index, 1);
                return true;
            }
            return false;
        },
        pick: function pick(channel) {
            this.init(channel);
            var count = this.raffleChannels[utils.normalizeChannel(channel)].length;
            if (count >= 1) {
                return this.raffleChannels[utils.normalizeChannel(channel)][Math.floor((Math.random() * count))];
            }
            return null;
        },
        reset: function reset(channel) {
            this.init(channel);
            this.raffleChannels[utils.normalizeChannel(channel)] = [];
        },
        count: function count(channel) {
            this.init(channel);
            if (this.raffleChannels[utils.normalizeChannel(channel)]) {
                return this.raffleChannels[utils.normalizeChannel(channel)].length;
            }
            return 0;
        },
        isParticipating: function isParticipating(channel, username) {
            this.init(channel);
            if (this.raffleChannels[utils.normalizeChannel(channel)].indexOf(utils.normalizeUsername(username)) >= 0) {
                return true;
            }
            return false;
        }
    },
    symbols: function symbols(line) {
        var count = 0;
        for (var i = 0; i < line.length; i++) {
            var charCode = line.substring(i, i+1).charCodeAt(0);
            if ((charCode <= 30 || charCode >= 127) || charCode === 65533) {
                count++;
            }
        }
        return Math.ceil((count / line.length) * 100) / 100;
    },
    uppercase: function uppercase(line) {
        var chars = line.length;
        var u_let = line.match(/[A-Z]/g);
        if (!_.isNull(u_let)) {
            return (u_let.length / chars);
        }
        return 0;
    }
};

client.prototype.nosql = {
    path: (database) => {
        this.database = new locallydb(database);
    },
    insert: (collection, elements) => {
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new Promise((resolve, reject) => {
            resolve(this.database.collection(collection).insert(elements));
        });
    },
    where: (collection, query) => {
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new Promise((resolve, reject) => {
            resolve(this.database.collection(collection).where(query));
        });
    },
    get: (collection, cid) => {
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new Promise((resolve, reject) => {
            resolve(this.database.collection(collection).get(cid) || null);
        });
    },
    list: (collection) => {
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new Promise((resolve, reject) => {
            resolve(this.database.collection(collection).items);
        });
    },
    update: (collection, cid, object) => {
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new Promise((resolve, reject) => {
            resolve(this.database.collection(collection).update(cid, object));
        });
    },
    replace: (collection, cid, object) => {
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new Promise((resolve, reject) => {
            resolve(this.database.collection(collection).replace(cid, object));
        });
    },
    remove: (collection, cid) => {
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new Promise((resolve, reject) => {
            resolve(this.database.collection(collection).remove(cid));
        });
    }
};

// Expose everything, for browser and Node.js / io.js
if (typeof window === "undefined" && module.exports) {
    module.exports = client;
} else {
    window.irc = {};
    window.irc.client = client;
}
