var api = require("./api");
var commands = require("./commands");
var cron = require("cron");
var eventEmitter = require("./events").EventEmitter;
var locallydb = require("locallydb");
var logger = require("./logger");
var parse = require("irc-message").parse;
var server = require("./server");
var timer = require("./timer");
var util = require("util");
var utils = require("./utils");
var webSocket = global.WebSocket || global.MozWebSocket || require("ws");
var _ = require("underscore");

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
    this.currentLatency = 0;
    this.globaluserstate = {};
    this.lastJoined = "";
    this.latency = new Date();
    this.moderators = {};
    this.pingLoop = null;
    this.pingTimeout = null;
    this.reason = "";
    this.reconnecting = false;
    this.reconnectTimer = 0;
    this.username = "";
    this.userstate = {};
    this.wasCloseCalled = false;
    this.ws = null;

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

    // Deprecation notice..
    if (typeof this.opts.connection.random !== "undefined") {
        this.opts.connection.cluster = this.opts.connection.random;
        this.log.warn("connection.random is deprecated, please use connection.cluster instead.");
    }

    eventEmitter.call(this);
}

util.inherits(client, eventEmitter);

client.prototype.api = api;

// Put all commands in prototype..
for(var methodName in commands) {
    client.prototype[methodName] = commands[methodName];
}

// Provide support for < Chrome 41 mainly due to CLR Browser
String.prototype.includes || (String.prototype.includes = function() {
    return -1 !== String.prototype.indexOf.apply(this, arguments)
}), String.prototype.startsWith || (String.prototype.startsWith = function(a, b) {
    return b = b || 0, this.indexOf(a, b) === b
});

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
                    if (!_.isNull(this.ws) && this.ws.readyState !== 2 && this.ws.readyState !== 3) {
                        this.ws.send("PONG");
                    }
                    break;

                // Received PONG from server, return current latency
                case "PONG":
                    var currDate = new Date();
                    this.currentLatency = (currDate.getTime() - this.latency.getTime()) / 1000;
                    this.emit("pong", this.currentLatency);
                    this.emit("_promisePing", this.currentLatency);

                    clearTimeout(this.pingTimeout);
                    break;

                default:
                    this.log.warn(`Could not parse message with no prefix:\n${JSON.stringify(message, null, 4)}`);
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
                    this.emit("_promiseConnect", null);
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
                            this.emit("_promiseSubscribers", null);
                            break;

                        // This room is no longer in subscribers-only mode.
                        case "subs_off":
                            this.log.info(`[${message.params[0]}] This room is no longer in subscribers-only mode.`);
                            this.emit("subscriber", message.params[0], false);
                            this.emit("subscribers", message.params[0], false);
                            this.emit("_promiseSubscribersoff", null);
                            break;

                        // This room is now in emote-only mode.
                        case "emote_only_on":
                            this.log.info(`[${message.params[0]}] This room is now in emote-only mode.`);
                            this.emit("emoteonly", message.params[0], true);
                            this.emit("_promiseEmoteonly", null);
                            break;

                        // This room is no longer in emote-only mode.
                        case "emote_only_off":
                            this.log.info(`[${message.params[0]}] This room is no longer in emote-only mode.`);
                            this.emit("emoteonly", message.params[0], false);
                            this.emit("_promiseEmoteonlyoff", null);
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
                            this.emit("_promiseR9kbeta", null);
                            break;

                        // This room is no longer in r9k mode.
                        case "r9k_off":
                            this.log.info(`[${message.params[0]}] This room is no longer in r9k mode.`);
                            this.emit("r9kmode", message.params[0], false);
                            this.emit("r9kbeta", message.params[0], false);
                            this.emit("_promiseR9kbetaoff", null);
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

                            this.emit("_promiseMods", null, mods);
                            this.emit("mods", message.params[0], mods);
                            break;

                        // There are no moderators for this room.
                        case "no_mods":
                            this.emit("_promiseMods", null, []);
                            break;

                        case "already_banned":
                        case "bad_ban_admin":
                        case "bad_ban_broadcaster":
                        case "bad_ban_global_mod":
                        case "bad_ban_self":
                        case "bad_ban_staff":
                        case "usage_ban":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseBan", message.params[1]);
                            break;

                        case "ban_success":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseBan", null);
                            break;

                        case "usage_clear":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseClear", message.params[1]);
                            break;

                        case "usage_mods":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseMods", message.params[1], []);
                            break;

                        case "mod_success":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseMod", null);
                            break;

                        case "usage_mod":
                        case "bad_mod_banned":
                        case "bad_mod_mod":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseMod", message.params[1]);
                            break;

                        case "unmod_success":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseUnmod", null);
                            break;

                        case "usage_unmod":
                        case "bad_unmod_mod":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseUnmod", message.params[1]);
                            break;

                        case "color_changed":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseColor", null);
                            break;

                        case "usage_color":
                        case "turbo_only_color":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseColor", message.params[1]);
                            break;

                        case "commercial_success":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseCommercial", null);
                            break;

                        case "usage_commercial":
                        case "bad_commercial_error":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseCommercial", message.params[1]);
                            break;

                        case "hosts_remaining":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            var remainingHost = (!isNaN(message.params[1].charAt(0)) ? message.params[1].charAt(0) : 0);
                            this.emit("_promiseHost", null, remainingHost);
                            break;

                        case "bad_host_hosting":
                        case "bad_host_rate_exceeded":
                        case "usage_host":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseHost", message.params[1], null);
                            break;

                        case "already_r9k_on":
                        case "usage_r9k_on":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseR9kbeta", message.params[1]);
                            break;

                        case "already_r9k_off":
                        case "usage_r9k_off":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseR9kbetaoff", message.params[1]);
                            break;

                        case "timeout_success":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseTimeout", null);
                            break;

                        case "already_subs_off":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseSubscribersoff", message.params[1]);
                            break;

                        case "already_subs_on":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseSubscribers", message.params[1]);
                            break;

                        case "already_emote_only_off":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseEmoteonlyoff", message.params[1]);
                            break;

                        case "already_emote_only_on":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseEmoteonly", message.params[1]);
                            break;

                        case "usage_slow_on":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseSlow", message.params[1]);
                            break;

                        case "usage_slow_off":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseSlowoff", message.params[1]);
                            break;

                        case "usage_subs_on":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseSubscribers", message.params[1]);
                            break;

                        case "usage_subs_off":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseSubscribersoff", message.params[1]);
                            break;

                        case "usage_emote_only_on":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseEmoteonly", message.params[1]);
                            break;

                        case "usage_emote_only_off":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseEmoteonlyoff", message.params[1]);
                            break;

                        case "usage_timeout":
                        case "bad_timeout_admin":
                        case "bad_timeout_broadcaster":
                        case "bad_timeout_global_mod":
                        case "bad_timeout_self":
                        case "bad_timeout_staff":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseTimeout", message.params[1]);
                            break;

                        case "unban_success":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseUnban", null);
                            break;

                        case "usage_unban":
                        case "bad_unban_no_ban":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseUnban", message.params[1]);
                            break;

                        case "usage_unhost":
                        case "not_hosting":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseUnhost", message.params[1]);
                            break;

                        case "whisper_invalid_self":
                        case "whisper_limit_per_min":
                        case "whisper_limit_per_sec":
                        case "whisper_restricted_recipient":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);
                            this.emit("_promiseWhisper", message.params[1]);
                            break;

                        case "no_permission":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);

                            // Handle permission error messages..
                            this.emit("_promiseBan", message.params[1]);
                            this.emit("_promiseClear", message.params[1]);
                            this.emit("_promiseUnban", message.params[1]);
                            this.emit("_promiseTimeout", message.params[1]);
                            this.emit("_promiseMod", message.params[1]);
                            this.emit("_promiseUnmod", message.params[1]);
                            this.emit("_promiseCommercial", message.params[1]);
                            this.emit("_promiseHost", message.params[1], null);
                            this.emit("_promiseR9kbeta", message.params[1]);
                            this.emit("_promiseR9kbetaoff", message.params[1]);
                            this.emit("_promiseSlow", message.params[1]);
                            this.emit("_promiseSlowoff", message.params[1]);
                            this.emit("_promiseSubscribers", message.params[1]);
                            this.emit("_promiseSubscribersoff", message.params[1]);
                            this.emit("_promiseEmoteonly", message.params[1]);
                            this.emit("_promiseEmoteonlyoff", message.params[1]);
                            break;

                        case "unrecognized_cmd":
                            this.log.info(`[${message.params[0]}] ${message.params[1]}`);
                            this.emit("notice", message.params[0], message.tags["msg-id"], message.params[1]);

                            if (message.params[1].split(" ").splice(-1)[0] === "/w") {
                                this.log.warn("You must be connected to a group server to send or receive whispers.");
                            }
                            break;

                        // Send the following msg-ids to the notice event listener..
                        case "cmds_available":
                        case "host_target_went_offline":
                        case "msg_banned":
                        case "msg_duplicate":
                        case "msg_verified_email":
                        case "msg_ratelimit":
                        case "msg_subsonly":
                        case "msg_timedout":
                        case "no_help":
                        case "usage_disconnect":
                        case "usage_help":
                        case "usage_me":
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
                                this.wasCloseCalled = false;
                                this.reconnect = false;
                                this.reason = "Login unsuccessful.";
                                this.log.error(this.reason);
                                this.ws.close();
                            }
                            else if (message.params[1].includes("Error logging in")) {
                                this.wasCloseCalled = false;
                                this.reconnect = false;
                                this.reason = "Error logging in.";
                                this.log.error(this.reason);
                                this.ws.close();
                            }
                            else if (message.params[1].includes("Invalid NICK")) {
                                this.wasCloseCalled = false;
                                this.reconnect = false;
                                this.reason = "Invalid NICK.";
                                this.log.error(this.reason);
                                this.ws.close();
                            }
                            else {
                                this.log.warn(`Could not parse NOTICE from tmi.twitch.tv:\n${JSON.stringify(message, null, 4)}`);
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
                        this.emit("_promiseUnhost", null);
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
                        this.emit("_promiseClear", null);
                    }
                    break;

                case "RECONNECT":
                    this.log.info("Received RECONNECT request from Twitch..");
                    this.log.info(`Disconnecting and reconnecting in ${this.reconnectTimer / 1000} seconds..`);
                    this.disconnect();
                    setTimeout(() => { this.connect(); }, this.reconnectTimer);
                    break;

                case "SERVERCHANGE":
                    this.log.warn(`Channel ${message.params[0]} isn't or no longer located on this cluster.`);
                    this.log.warn(`Read more: https://www.tmijs.org/forums/index.php?/topic/39-channel-specific-chat-server-clusters/`);
                    this.emit("serverchange", message.params[0]);
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
                        this.emit("_promiseJoin", null);
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
                            this.emit("_promiseSlowoff", null);
                        } else {
                            this.log.info(`[${message.params[0]}] This room is now in slow mode.`);
                            this.emit("slow", message.params[0], true, message.tags.slow);
                            this.emit("slowmode", message.params[0], true, message.tags.slow);
                            this.emit("_promiseSlow", null);
                        }
                    }
                    break;

                default:
                    this.log.warn(`Could not parse message from tmi.twitch.tv:\n${JSON.stringify(message, null, 4)}`);
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
                    this.log.warn(`Could not parse message from jtv:\n${JSON.stringify(message, null, 4)}`);
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
                        this.emit("_promiseJoin", null);
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
                        this.emit("_promisePart", null);
                    }
                    this.emit("part", message.params[0], message.prefix.split("!")[0]);
                    break;

                case "WHISPER":
                    this.log.info(`[WHISPER] <${message.prefix.split("!")[0]}>: ${message.params[1]}`);

                    if (!message.tags.hasOwnProperty("username")) { message.tags.username = message.prefix.split("!")[0]; }
                    message.tags["message-type"] = "whisper";

                    this.emit("whisper", message.tags, message.params[1]);
                    this.emit("message", null, message.tags, message.params[1], false);
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
                    this.log.warn(`Could not parse message:\n${JSON.stringify(message, null, 4)}`);
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
        this.port = typeof this.opts.connection.port === "undefined" ? 80 : this.opts.connection.port;
        this.secure = typeof this.opts.connection.secure === "undefined" ? false : this.opts.connection.secure;

        // Override port because we are using a secure connection..
        if (this.secure) { this.port = 443; }
        if (this.port === 443) { this.secure = true; }

        this.reconnectTimer = this.reconnectTimer + 10000;
        if (this.reconnectTimer >= 60000) {
            this.reconnectTimer = 60000;
        }

        // Connect to a random server..
        if (this.server === "RANDOM" || typeof this.opts.connection.cluster !== "undefined") {
            var random = typeof this.opts.connection.cluster === "undefined" ? "chat" : this.opts.connection.cluster;

            // Default type is "chat" server..
            server.getRandomServer(random, this.secure, (addr) => {
                this.server = addr.split(":")[0];
                this.port = addr.split(":")[1];

                this._openConnection();
                this.once("_promiseConnect", (err) => {
                    if (!err) { resolve([this.server, this.port]); }
                    else { reject(err); }
                });
            });
        }
        // Connect to server from configuration..
        else {
            this._openConnection();
            this.once("_promiseConnect", (err) => {
                if (!err) { resolve([this.server, this.port]); }
                else { reject(err); }
            });
        }
    });
};

// Open a connection..
client.prototype._openConnection = function _openConnection() {
    var protocol = "ws";
    if (this.secure) { protocol = "wss" }

    server.isWebSocket(protocol, this.server, this.port, (accepts) => {
        // Server is accepting WebSocket connections..
        if (accepts) {
            this.ws = new webSocket(protocol + "://" + this.server + ":" + this.port + "/", "irc");

            this.ws.onmessage = this._onMessage.bind(this);
            this.ws.onerror = this._onError.bind(this);
            this.ws.onclose = this._onClose.bind(this);
            this.ws.onopen = this._onOpen.bind(this);
        }
        // Server is not accepting WebSocket connections..
        else {
            this.reason = "Sorry, we were unable to connect to chat.";
            this.emit("disconnected", this.reason);
            if (this.reconnect && !this.reconnecting) {
                this.reconnecting = true;
                this.log.error(`Could not connect to server. Trying to reconnect in ${this.reconnectTimer / 1000} seconds..`);
                this.emit("reconnect");

                setTimeout(() => { this.reconnecting = false; this.connect(); }, this.reconnectTimer);
            } else {
                if (!this.reconnecting) {
                    this.reason = "Could not connect to server.";
                    this.log.error(this.reason);
                }
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
        this.reason = "Unable to connect.";
        this.log.error(this.reason);
        this.emit("_promiseConnect", this.reason);
        this.emit("disconnected", this.reason);
    } else {
        this.reason = "Connection closed.";
        this.log.error(this.reason);
        this.emit("_promiseConnect", this.reason);
        this.emit("disconnected", this.reason);
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
        this.reason = "Connection closed.";
        this.log.info(this.reason);
        this.emit("_promiseConnect", this.reason);
        this.emit("_promiseDisconnect", null);
        this.emit("disconnected", this.reason);
    }
    // Got disconnected from server..
    else {
        this.emit("_promiseConnect", this.reason);
        this.emit("disconnected", this.reason);

        if (this.reconnect && !this.reconnecting) {
            this.reconnecting = true;
            this.log.error(`Could not connect to server. Trying to reconnect in ${this.reconnectTimer / 1000} seconds..`);
            this.emit("reconnect");
            setTimeout(() => { this.reconnecting = false; this.connect(); }, this.reconnectTimer);
        }
    }

    this.ws = null;
};

// Minimum of 600ms for command promises, if current latency exceed, add 100ms to it to make sure it doesn't get timed out..
client.prototype._getPromiseDelay = function _getPromiseDelay() {
    if (this.currentLatency <= 600) { return 600; }
    else { return this.currentLatency + 100; }
};

// Send command to server or channel..
client.prototype._sendCommand = function _sendCommand(delay, channel, command, fn) {
    // Race promise against delay..
    return new Promise((resolve, reject) => {
        utils.promiseDelay(delay).then(() => { reject("No response from Twitch."); });

        if (!_.isNull(this.ws) && this.ws.readyState !== 2 && this.ws.readyState !== 3) {
            if (!_.isNull(channel)) {
                this.log.info(`[${utils.normalizeChannel(channel)}] Executing command: ${command}`);
                this.ws.send(`PRIVMSG ${utils.normalizeChannel(channel)} :${command}`);
            } else {
                this.log.info(`Executing command: ${command}`);
                this.ws.send(command);
            }
            fn(resolve, reject);
        }
        // Disconnected from server..
        else { reject("Not connected to server."); }
    });
};

// Send a message to channel..
client.prototype._sendMessage = function _sendMessage(delay, channel, message, fn) {
    // Promise a result..
    return new Promise((resolve, reject) => {
        if (!_.isNull(this.ws) && this.ws.readyState !== 2 && this.ws.readyState !== 3 && !this.getUsername().includes("justinfan")) {
            if (!this.userstate[utils.normalizeChannel(channel)]) {
                this.userstate[utils.normalizeChannel(channel)] = {}
            }

            if (message.length >= 500) {
                var msg = utils.splitLine(message, 500);
                message = msg[0];

                setTimeout(() => {
                    this._sendMessage(channel, msg[1]);
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
            fn(resolve, reject);
        } else {
            reject("Not connected to server.");
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
            this.once("_promiseDisconnect", () => { resolve([this.server, this.port]); });
        } else {
            this.log.error("Cannot disconnect from server. Socket is not opened or connection is already closing.");
            reject("Cannot disconnect from server. Socket is not opened or connection is already closing.");
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
if (typeof module !== "undefined" && module.exports) {
    module.exports = client;
}
if (typeof window !== "undefined") {
    window.irc = {};
    window.irc.client = client;
}
