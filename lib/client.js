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
var vow = require("vow");
var webSocket = require("ws");
var _ = require("underscore");
var contains = require("underscore.string/include");
var startsWith = require("underscore.string/startsWith");

// Client instance..
var client = function client(opts) {
    this.setMaxListeners(0);

    this.opts = typeof opts === "undefined" ? {} : opts;
    this.opts.channels = opts.channels || [];
    this.opts.connection = opts.connection || {};
    this.opts.identity = opts.identity || {};
    this.opts.options = opts.options || {};

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

    this.eventMods = [];

    // Create the logger..
    this.log = logger.createLogger("tmi.js", "error", "raw");

    // Show debug messages ?
    if (typeof this.opts.options.debug === "undefined" ? false : this.opts.options.debug) { this.log.level("info"); }

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
    var self = this;

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
                if (_.isBoolean(message.tags[key])) { message.tags[key] = null; }
               else if (message.tags[key] === "1") { message.tags[key] = true; }
               else if (message.tags[key] === "0") { message.tags[key] = false; }
            }
        }

        // Messages with no prefix..
        if (_.isNull(message.prefix)) {
            switch(message.command) {
                // Received PING from server..
                case "PING":
                    self.emit("ping");
                    self.ws.send("PONG");
                    break;

                // Received PONG from server, return current latency
                case "PONG":
                    var currDate = new Date();
                    var latency = (currDate.getTime() - self.latency.getTime()) / 1000;
                    self.emit("pong", latency);

                    clearTimeout(self.pingTimeout);
                    break;

                default:
                    self.log.warn("Could not parse message with no prefix:");
                    self.log.warn(message);
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
                    self.username = message.params[0];
                    break;

                // Connected to server..
                case "372":
                    self.log.info("Connected to server.");
                    self.userstate["#jtv"] = {};
                    self.emit("connected", self.server, self.port);
                    self.reconnectTimer = 0;

                    self.pingLoop = setInterval(function() {
                        if (!_.isNull(self.ws) && self.ws.readyState !== 2 && self.ws.readyState !== 3) {
                            self.ws.send("PING");
                        }
                        self.latency = new Date();
                        self.pingTimeout = setTimeout(function () {
                            if (!_.isNull(self.ws)) {
                                self.wasCloseCalled = false;
                                self.log.error("Ping timeout.");
                                self.ws.close();
                            }
                        }, typeof self.opts.connection.timeout === "undefined" ? 9999 : self.opts.connection.timeout);
                    }, 60000);

                    // Join all the channels from configuration every 2 seconds..
                    var joinQueue = new timer.queue(2000);

                    for (var i = 0; i < self.opts.channels.length; i++) {
                        joinQueue.add(function(i) {
                            if (!_.isNull(self.ws) && self.ws.readyState !== 2 && self.ws.readyState !== 3) {
                                self.ws.send("JOIN " + utils.normalizeChannel(self.opts.channels[i]));
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
                            self.log.info("[" + message.params[0] + "] This room is now in subscribers-only mode.");
                            self.emit("subscriber", message.params[0], true);
                            self.emit("subscribers", message.params[0], true);
                            break;

                        // This room is no longer in subscribers-only mode.
                        case "subs_off":
                            self.log.info("[" + message.params[0] + "] This room is no longer in subscribers-only mode.");
                            self.emit("subscriber", message.params[0], false);
                            self.emit("subscribers", message.params[0], false);
                            break;

                        // Moved to ROOMSTATE.
                        case "slow_on":
                        case "slow_off":
                            break;

                        // This room is now in r9k mode.
                        case "r9k_on":
                            self.log.info("[" + message.params[0] + "] This room is now in r9k mode.");
                            self.emit("r9kmode", message.params[0], true);
                            break;

                        // This room is no longer in r9k mode.
                        case "r9k_off":
                            self.log.info("[" + message.params[0] + "] This room is no longer in r9k mode.");
                            self.emit("r9kmode", message.params[0], false);
                            self.emit("r9kbeta", message.params[0], false);
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

                            self.eventMods = mods;

                            self.emit("mods", message.params[0], mods);
                            break;

                        // There are no moderators for this room.
                        case "no_mods":
                            self.eventMods = [];
                            break;

                        // Send the following msg-ids to the notice event listener..
                        case "already_subs_off":
                        case "bad_ban_broadcaster":
                        case "bad_ban_self":
                        case "bad_commercial_error":
                        case "bad_mod_banned":
                        case "bad_timeout_self":
                        case "bad_unban_no_ban":
                        case "ban_success":
                        case "cmds_available":
                        case "color_changed":
                        case "commercial_success":
                        case "msg_banned":
                        case "msg_duplicate":
                        case "msg_subsonly":
                        case "msg_timedout":
                        case "no_help":
                        case "no_permission":
                        case "timeout_success":
                        case "unban_success":
                        case "unrecognized_cmd":
                        case "usage_ban":
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
                          self.log.info("[" + message.params[0] + "] " + message.params[1]);
                          self.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                          break;

                        // Ignore this because we are already listening to HOSTTARGET.
                        case "host_on":
                        case "host_off":
                            //
                            break;

                        default:
                            if (contains(message.params[1], "Login unsuccessful")) {
                                self.wasCloseCalled = true;
                                self.log.error("Login unsuccessful.");
                                self.ws.close();
                            }
                            else if (contains(message.params[1], "Error logging in")) {
                                self.wasCloseCalled = true;
                                self.log.error("Error logging in.");
                                self.ws.close();
                            }
                            else {
                                self.log.warn("Could not parse NOTICE from tmi.twitch.tv:");
                                self.log.warn(message);
                            }
                            break;
                    }
                    break;

                // Channel is now hosting another channel or exited host mode..
                case "HOSTTARGET":
                    // Stopped hosting..
                    if (message.params[1].split(" ")[0] === "-") {
                        self.log.info("[" + message.params[0] + "] Exited host mode.");
                        self.emit("unhost", message.params[0], message.params[1].split(" ")[0]);
                    }
                    // Now hosting..
                    else {
                        var viewers = message.params[1].split(" ")[1] || 0;
                        if (!utils.isInteger(viewers)) { viewers = 0; }

                        self.log.info("[" + message.params[0] + "] Now hosting " + message.params[1].split(" ")[0] + " for " + viewers + " viewer(s).");
                        self.emit("hosting", message.params[0], message.params[1].split(" ")[0], viewers);
                    }
                    break;

                // Someone has been timed out or chat has been cleared by a moderator..
                case "CLEARCHAT":
                    // User has been timed out by a moderator..
                    if (message.params.length > 1) {
                        self.log.info("[" + message.params[0] + "] " + message.params[1] + " has been timed out.");
                        self.emit("timeout", message.params[0], message.params[1]);
                    }
                    // Chat was cleared by a moderator..
                    else {
                        self.log.info("[" + message.params[0] + "] Chat was cleared by a moderator.");
                        self.emit("clearchat", message.params[0]);
                    }
                    break;

                case "RECONNECT":
                    self.log.info("Received RECONNECT request from Twitch..");
                    self.log.info("Disconnecting and reconnecting in " + self.reconnectTimer / 1000 + " seconds..");
                    self.disconnect();
                    setTimeout(function() { self.connect(); }, self.reconnectTimer);
                    break;

                // Received when joining a channel and every time you send a PRIVMSG to a channel.
                case "USERSTATE":
                    message.tags.username = self.username;
                    // Add the client to the moderators of this room..
                    if (message.tags["user-type"] === "mod") {
                        if (!self.moderators[self.lastJoined]) { self.moderators[self.lastJoined] = []; }
                        if (self.moderators[self.lastJoined].indexOf(self.username) < 0) { self.moderators[self.lastJoined].push(self.username); }
                    }

                    if (!contains(self.getUsername(), "justinfan") && !self.userstate[utils.normalizeChannel(message.params[0])]) {
                        self.userstate[message.params[0]] = message.tags;
                        self.lastJoined = message.params[0];
                        self.log.info("Joined " + message.params[0]);
                        self.emit("join", message.params[0], utils.normalizeUsername(self.getUsername()));
                    }
                    self.userstate[message.params[0]] = message.tags;
                    break;

                // Describe non-channel-specific state informations.
                case "GLOBALUSERSTATE":
                    self.globaluserstate = message.tags;
                    break;

                case "ROOMSTATE":
                    message.tags.channel = self.lastJoined;
                    self.emit("roomstate", message.params[0], message.tags);

                    // This room is now in slow mode. You may send messages every slow_duration seconds.
                    if (message.tags.hasOwnProperty("slow") && !message.tags.hasOwnProperty("subs-only")) {
                        if (typeof message.tags.slow === "boolean") {
                            self.log.info("[" + message.params[0] + "] This room is no longer in slow mode.");
                            self.emit("slow", message.params[0], false, 0);
                            self.emit("slowmode", message.params[0], false, 0);
                        } else {
                            self.log.info("[" + message.params[0] + "] This room is now in slow mode.");
                            self.emit("slow", message.params[0], true, message.tags.slow);
                            self.emit("slowmode", message.params[0], true, message.tags.slow);
                        }
                    }
                    break;

                default:
                    self.log.warn("Could not parse message from tmi.twitch.tv:");
                    self.log.warn(message);
                    break;
            }
        }

        // Messages from jtv..
        else if (message.prefix === "jtv") {
            switch(message.command) {
                case "MODE":
                    if (message.params[1] === "+o") {
                        // Add username to the moderators..
                        if (!self.moderators[message.params[0]]) { self.moderators[message.params[0]] = []; }
                        if (self.moderators[message.params[0]].indexOf(message.params[2]) < 0) { self.moderators[message.params[0]].push(message.params[2]); }

                        self.emit("mod", message.params[0], message.params[2]);
                    }
                    else if (message.params[1] === "-o") {
                        // Remove username from the moderators..
                        if (!self.moderators[message.params[0]]) { self.moderators[message.params[0]] = []; }
                        self.moderators[message.params[0]].filter(function(value) { return value != message.params[2]; });

                        self.emit("unmod", message.params[0], message.params[2]);
                    }
                    break;

                default:
                    self.log.warn("Could not parse message from jtv:");
                    self.log.warn(message);
                    break;
            }
        }

        // Anything else..
        else {
            switch(message.command) {
                case "353":
                    self.emit("names", message.params[2], message.params[3].split(" "));
                    break;

                case "366":
                    break;

                case "JOIN":
                    if (contains(self.getUsername(), "justinfan") && self.username === message.prefix.split("!")[0]) {
                        self.lastJoined = message.params[0];
                        self.log.info("Joined " + message.params[0]);
                        self.emit("join", message.params[0], message.prefix.split("!")[0]);
                    }

                    if (self.username !== message.prefix.split("!")[0]) {
                        self.emit("join", message.params[0], message.prefix.split("!")[0]);
                    }

                    break;

                case "PART":
                    if (self.username === message.prefix.split("!")[0]) {
                        if (self.userstate[message.params[0]]) { delete self.userstate[message.params[0]]; }
                        self.log.info("Left " + message.params[0]);
                    }
                    self.emit("part", message.params[0], message.prefix.split("!")[0]);
                    break;

                case "WHISPER":
                    self.log.info("[WHISPER] <" + message.prefix.split("!")[0] + ">: " + message.params[1]);
                    self.emit("whisper", message.prefix.split("!")[0], message.params[1]);

                    var whisperTags = {
                        username: message.prefix.split("!")[0],
                        "message-type": "whisper"
                    }
                    self.emit("message", null, whisperTags, message.params[1], false);
                    break;

                case "PRIVMSG":
                    // Add username (lowercase) to the tags..
                    message.tags.username = message.prefix.split("!")[0];

                    // Message is an action..
                    if (message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                        message.tags["message-type"] = "action";
                        self.log.info("[" + message.params[0] + "] *<" + message.tags.username + ">: " + message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                        self.emit("action", message.params[0], message.tags, message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], false);
                        self.emit("message", message.params[0], message.tags, message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], false);
                    }
                    // Message is a regular message..
                    else {
                        message.tags["message-type"] = "chat";
                        self.log.info("[" + message.params[0] + "] <" + message.tags.username + ">: " + message.params[1]);
                        self.emit("chat", message.params[0], message.tags, message.params[1], false);
                        self.emit("message", message.params[0], message.tags, message.params[1], false);
                    }

                    // Message from TwitchNotify..
                    if (message.tags.username === "twitchnotify") {
                        // Someone subscribed to a hosted channel. Who cares.
                        if (contains(message.params[1], "subscribed to")) {
                            //
                        }
                        // New subscriber..
                        else if (contains(message.params[1], "just subscribed")) {
                            self.emit("subscription", message.params[0], message.params[1].split(" ")[0]);
                        }
                        // Subanniversary..
                        else if (contains(message.params[1], "subscribed") && contains(message.params[1], "in a row")) {
                            var splitted = message.params[1].split(" ");
                            var length = splitted[splitted.length - 5];

                            self.emit("subanniversary", message.params[0], splitted[0], length);
                        }
                    }

                    // Message from JTV..
                    else if (message.tags.username === "jtv") {
                        // Someone is hosting my channel..
                        if (contains(message.params[1], "is now hosting you for")) {
                            self.emit("hosted", message.params[0], utils.normalizeUsername(message.params[1].split(" ")[0]), message.params[1].split(" ")[6]);
                        }
                        else if (contains(message.params[1], "is now hosting you")) {
                            self.emit("hosted", message.params[0], utils.normalizeUsername(message.params[1].split(" ")[0]), 0);
                        }
                    }
                    break;

                default:
                    self.log.warn("Could not parse message:");
                    self.log.warn(message);
                    break;
            }
        }
    }
};

// Connect to server..
client.prototype.connect = function connect() {
    var self = this;
    var deferred = vow.defer();

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
        server.getRandomServer(typeof self.opts.connection.random === "undefined" ? "chat" : self.opts.connection.random, function (addr) {
            self.server = addr.split(":")[0];
            self.port = addr.split(":")[1];

            self._openConnection();
            deferred.resolve();
        });
    }
    // Connect to server from configuration..
    else {
        this._openConnection();
        deferred.resolve();
    }

    return deferred.promise();
};

// Open a connection..
client.prototype._openConnection = function _openConnection() {
    var self = this;

    server.isWebSocket(self.server, self.port, function(accepts) {
        // Server is accepting WebSocket connections..
        if (accepts) {
            self.ws = new webSocket("ws://" + self.server + ":" + self.port + "/", "irc");

            self.ws.onmessage = self._onMessage.bind(self);
            self.ws.onerror = self._onError.bind(self);
            self.ws.onclose = self._onClose.bind(self);
            self.ws.onopen = self._onOpen.bind(self);
        }
        // Server is not accepting WebSocket connections..
        else {
            self.emit("disconnected", "Sorry, we were unable to connect to chat.");

            if (self.reconnect) {
                self.log.error("Server is not accepting WebSocket connections. Reconnecting in " + self.reconnectTimer / 1000 + " seconds..");
                self.emit("reconnect");
                setTimeout(function() { self.connect(); }, self.reconnectTimer);
            } else {
                self.log.error("Server is not accepting WebSocket connections.");
            }
        }
    });
};

// Called when the WebSocket connection's readyState changes to OPEN.
// Indicates that the connection is ready to send and receive data..
client.prototype._onOpen = function _onOpen() {
    // Emitting "connecting" event..
    this.log.info("Connecting to %s on port %s..", this.server, this.port);
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
    this.ws.send("PASS " + this.password);
    this.ws.send("NICK " + this.username);
    this.ws.send("USER " + this.username + " 8 * :" + this.username);
};

// Called when a message is received from the server..
client.prototype._onMessage = function _onMessage(event) {
    var self = this;
    var parts = event.data.split("\r\n");

    parts.forEach(function(line) {
        if (line !== null) {
            self.handleMessage(parse(line));
        }
    });
};

// Called when an error occurs..
client.prototype._onError = function _onError() {
    var self = this;

    this.moderators = {};
    this.userstate = {};
    this.globaluserstate = {};
    clearInterval(self.pingLoop);
    clearTimeout(self.pingTimeout);

    if (!_.isNull(this.ws)) {
        this.log.error("Unable to connect.");
        this.emit("disconnected", "Unable to connect.");
    } else {
        this.log.error("Connection closed.");
        this.emit("disconnected", "Connection closed.");
    }
};

// Called when the WebSocket connection's readyState changes to CLOSED..
client.prototype._onClose = function _onClose() {
    var self = this;

    this.moderators = {};
    this.userstate = {};
    this.globaluserstate = {};
    clearInterval(self.pingLoop);
    clearTimeout(self.pingTimeout);

    // User called .disconnect();
    if (this.wasCloseCalled) {
        this.wasCloseCalled = false;
        this.log.info("Connection closed.");
        this.emit("disconnected", "Connection closed.");
    }
    // Got disconnected from server..
    else {
        this.emit("disconnected", "Unable to connect to chat.");

        if (this.reconnect) {
            this.log.error("Sorry, we were unable to connect to chat. Reconnecting in " + self.reconnectTimer / 1000 + " seconds..");
            this.emit("reconnect");
            setTimeout(function() { self.connect(); }, self.reconnectTimer);
        } else {
            this.log.error("Sorry, we were unable to connect to chat.");
        }
    }
};

// Send a command to the server..
client.prototype._sendCommand = function _sendCommand(channel, command) {
    var self = this;

    // Promise a result..
    return new vow.Promise(function(resolve, reject, notify) {
        if (!_.isNull(self.ws) && self.ws.readyState !== 2 && self.ws.readyState !== 3) {
            switch (command.toLowerCase()) {
                case "/mods":
                case ".mods":
                    self.log.info("Executing command: " + command);
                    self.def("eventMods", function (oldValue, newValue) {
                        newValue.forEach(function(username) {
                            if (!self.moderators[channel]) { self.moderators[channel] = []; }
                            if (self.moderators[channel].indexOf(username) < 0) { self.moderators[channel].push(username); }
                        });
                        resolve(newValue);
                    });
                    self.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + command);
                    break;
                default:
                    if (!_.isNull(channel)) {
                        self.log.info("[" + utils.normalizeChannel(channel) + "] Executing command: " + command);
                        self.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + command);
                    } else {
                        self.log.info("Executing command: " + command);
                        self.ws.send(command);
                        if (command === "PING") {
                            self.latency = new Date();
                            self.pingTimeout = setTimeout(function () {
                                if (!_.isNull(self.ws)) {
                                    self.wasCloseCalled = false;
                                    self.log.error("Ping timeout.");
                                    self.ws.close();
                                }
                            }, typeof self.opts.connection.timeout === "undefined" ? 9999 : self.opts.connection.timeout);
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
    var self = this;

    // Promise a result..
    return new vow.Promise(function(resolve, reject, notify) {
        if (!_.isNull(self.ws) && self.ws.readyState !== 2 && self.ws.readyState !== 3 && !contains(self.getUsername(), "justinfan")) {
            self.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + message);

            if (message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                self.userstate[utils.normalizeChannel(channel)]["message-type"] = "action";
                self.log.info("[" + utils.normalizeChannel(channel) + "] *<" + self.getUsername() + ">: " + message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                self.emit("action", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], true);
                self.emit("message", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], true);
            }
            else {
                self.userstate[utils.normalizeChannel(channel)]["message-type"] = "chat";
                self.log.info("[" + utils.normalizeChannel(channel) + "] <" + self.getUsername() + ">: " + message);
                self.emit("chat", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message, true);
                self.emit("message", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message, true);
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

// Check if username is a moderator on a channel..
client.prototype.isMod = function isMod(channel, username) {
    if (!this.moderators[utils.normalizeChannel(channel)]) { this.moderators[utils.normalizeChannel(channel)] = []; }
    if (this.moderators[utils.normalizeChannel(channel)].indexOf(utils.normalizeUsername(username)) >= 0) {
        return true;
    }
    return false;
};

// Disconnect from server..
client.prototype.disconnect = function disconnect() {
    var deferred = vow.defer();

    if (!_.isNull(this.ws) && this.ws.readyState !== 3) {
        this.wasCloseCalled = true;
        this.log.info("Disconnecting from server..");
        this.ws.close();
        deferred.resolve();
    } else {
        this.log.error("Cannot disconnect from server. Socket is not opened or connection is already closing.");
        deferred.reject();
    }

    return deferred.promise();
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
    path: function path(database) {
        this.database = new locallydb(database);
    },
    insert: function insert(collection, elements) {
        var self = this;
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new vow.Promise(function(resolve) {
            resolve(self.database.collection(collection).insert(elements));
        });
    },
    where: function where(collection, query) {
        var self = this;
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new vow.Promise(function(resolve) {
            resolve(self.database.collection(collection).where(query));
        });
    },
    get: function get(collection, cid) {
        var self = this;
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new vow.Promise(function(resolve) {
            resolve(self.database.collection(collection).get(cid) || null);
        });
    },
    list: function list(collection) {
        var self = this;
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new vow.Promise(function(resolve) {
            resolve(self.database.collection(collection).items);
        });
    },
    update: function update(collection, cid, object) {
        var self = this;
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new vow.Promise(function(resolve) {
            resolve(self.database.collection(collection).update(cid, object));
        });
    },
    replace: function replace(collection, cid, object) {
        var self = this;
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new vow.Promise(function(resolve) {
            resolve(self.database.collection(collection).replace(cid, object));
        });
    },
    remove: function remove(collection, cid) {
        var self = this;
        if (typeof this.database === "undefined") { this.path("./database"); }

        return new vow.Promise(function(resolve) {
            resolve(self.database.collection(collection).remove(cid));
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
