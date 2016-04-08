var api = require("./api");
var commands = require("./commands");
var eventEmitter = require("./events").EventEmitter;
var logger = require("./logger");
var parse = require("irc-message").parse;
var timer = require("./timer");
var ws = global.WebSocket || global.MozWebSocket || require("ws");
var _ = require("./utils");

// Client instance..
var client = function client(opts) {
    if (this instanceof client === false) { return new client(opts); }
    this.setMaxListeners(0);

    this.opts = _.get(opts, {});
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
    if (this.opts.options.debug) { level = "info"; }
    this.log = this.opts.logger || logger;

    try { logger.setLevel(level); } catch(e) {};

    // Format the channel names..
    this.opts.channels.forEach(function(part, index, theArray) {
        theArray[index] = _.channel(part);
    });

    // Deprecation notice..
    if (typeof this.opts.connection.random !== "undefined") {
        this.opts.connection.cluster = this.opts.connection.random;
        this.log.warn("connection.random is deprecated, please use connection.cluster instead.");
    }

    eventEmitter.call(this);
}

_.inherits(client, eventEmitter);

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
        var channel = _.channel(_.get(message.params[0], null));

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
                    this.emits(["pong", "_promisePing"], [[this.currentLatency], [this.currentLatency]]);

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
                    this.emits(["connected", "_promiseConnect"], [[this.server, this.port], [null]]);
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
                        }, _.get(this.opts.connection.timeout, 9999));
                    }, 60000);

                    // Join all the channels from configuration every 2 seconds..
                    var joinQueue = new timer.queue(2000);

                    var joinChannels = _.union(this.opts.channels, this.channels);
                    this.channels = [];

                    for (var i = 0; i < joinChannels.length; i++) {
                        var self = this;
                        joinQueue.add(function(i) {
                            if (!_.isNull(self.ws) && self.ws.readyState !== 2 && self.ws.readyState !== 3) {
                                self.ws.send("JOIN " + _.channel(joinChannels[i]));
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
                            this.log.info(`[${channel}] This room is now in subscribers-only mode.`);
                            this.emits(["subscriber", "subscribers", "_promiseSubscribers"], [[channel, true], [channel, true], [null]]);
                            break;

                        // This room is no longer in subscribers-only mode.
                        case "subs_off":
                            this.log.info(`[${channel}] This room is no longer in subscribers-only mode.`);
                            this.emits(["subscriber", "subscribers", "_promiseSubscribersoff"], [[channel, false], [channel, false], [null]]);
                            break;

                        // This room is now in emote-only mode.
                        case "emote_only_on":
                            this.log.info(`[${channel}] This room is now in emote-only mode.`);
                            this.emits(["emoteonly", "_promiseEmoteonly"], [[channel, true], [null]]);
                            break;

                        // This room is no longer in emote-only mode.
                        case "emote_only_off":
                            this.log.info(`[${channel}] This room is no longer in emote-only mode.`);
                            this.emits(["emoteonly", "_promiseEmoteonlyoff"], [[channel, false], [null]]);
                            break;

                        // Moved to ROOMSTATE.
                        case "slow_on":
                        case "slow_off":
                            break;

                        // This room is now in r9k mode.
                        case "r9k_on":
                            this.log.info(`[${channel}] This room is now in r9k mode.`);
                            this.emits(["r9kmode", "r9kbeta", "_promiseR9kbeta"], [[channel, true], [channel, true], [null]]);
                            break;

                        // This room is no longer in r9k mode.
                        case "r9k_off":
                            this.log.info(`[${channel}] This room is no longer in r9k mode.`);
                            this.emits(["r9kmode", "r9kbeta", "_promiseR9kbetaoff"], [[channel, false], [channel, false], [null]]);
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

                            this.emits(["_promiseMods", "mods"], [[null, mods], [channel, mods]]);
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
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseBan"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "ban_success":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseBan"], [[channel, message.tags["msg-id"], message.params[1]], [null]]);
                            break;

                        case "usage_clear":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseClear"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_mods":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseMods"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1], []]]);
                            break;

                        case "mod_success":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseMod"], [[channel, message.tags["msg-id"], message.params[1]], [null]]);
                            break;

                        case "usage_mod":
                        case "bad_mod_banned":
                        case "bad_mod_mod":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseMod"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "unmod_success":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseUnmod"], [[channel, message.tags["msg-id"], message.params[1]], [null]]);
                            break;

                        case "usage_unmod":
                        case "bad_unmod_mod":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseUnmod"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "color_changed":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseColor"], [[channel, message.tags["msg-id"], message.params[1]], [null]]);
                            break;

                        case "usage_color":
                        case "turbo_only_color":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseColor"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "commercial_success":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseCommercial"], [[channel, message.tags["msg-id"], message.params[1]], [null]]);
                            break;

                        case "usage_commercial":
                        case "bad_commercial_error":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseCommercial"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "hosts_remaining":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            var remainingHost = (!isNaN(message.params[1].charAt(0)) ? message.params[1].charAt(0) : 0);
                            this.emits(["notice", "_promiseHost"], [[channel, message.tags["msg-id"], message.params[1]], [null, remainingHost]]);
                            break;

                        case "bad_host_hosting":
                        case "bad_host_rate_exceeded":
                        case "usage_host":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseHost"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1], null]]);
                            break;

                        case "already_r9k_on":
                        case "usage_r9k_on":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseR9kbeta"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "already_r9k_off":
                        case "usage_r9k_off":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseR9kbetaoff"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "timeout_success":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseTimeout"], [[channel, message.tags["msg-id"], message.params[1]], [null]]);
                            break;

                        case "already_subs_off":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseSubscribersoff"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "already_subs_on":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseSubscribers"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "already_emote_only_off":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseEmoteonlyoff"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "already_emote_only_on":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseEmoteonly"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_slow_on":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseSlow"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_slow_off":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseSlowoff"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_subs_on":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseSubscribers"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_subs_off":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseSubscribersoff"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_emote_only_on":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseEmoteonly"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_emote_only_off":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseEmoteonlyoff"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_timeout":
                        case "bad_timeout_admin":
                        case "bad_timeout_broadcaster":
                        case "bad_timeout_global_mod":
                        case "bad_timeout_self":
                        case "bad_timeout_staff":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseTimeout"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "unban_success":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseUnban"], [[channel, message.tags["msg-id"], message.params[1]], [null]]);
                            break;

                        case "usage_unban":
                        case "bad_unban_no_ban":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseUnban"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "usage_unhost":
                        case "not_hosting":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseUnhost"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "whisper_invalid_self":
                        case "whisper_limit_per_min":
                        case "whisper_limit_per_sec":
                        case "whisper_restricted_recipient":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emits(["notice", "_promiseWhisper"], [[channel, message.tags["msg-id"], message.params[1]], [message.params[1]]]);
                            break;

                        case "no_permission":
                            var permMsg = message.params[1];
                            this.log.info(`[${channel}] ${permMsg}`);
                            this.emits([
                                "notice",
                                "_promiseBan",
                                "_promiseClear",
                                "_promiseUnban",
                                "_promiseTimeout",
                                "_promiseMod",
                                "_promiseUnmod",
                                "_promiseCommercial",
                                "_promiseHost",
                                "_promiseUnhost",
                                "_promiseR9kbeta",
                                "_promiseR9kbetaoff",
                                "_promiseSlow",
                                "_promiseSlowoff",
                                "_promiseSubscribers",
                                "_promiseSubscribersoff",
                                "_promiseEmoteonly",
                                "_promiseEmoteonlyoff"
                            ], [
                                [channel, message.tags["msg-id"], permMsg],
                                [permMsg], [permMsg], [permMsg], [permMsg],
                                [permMsg], [permMsg], [permMsg], [permMsg],
                                [permMsg], [permMsg], [permMsg], [permMsg],
                                [permMsg], [permMsg], [permMsg], [permMsg],
                                [permMsg]
                            ]);
                            break;

                        case "unrecognized_cmd":
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emit("notice", channel, message.tags["msg-id"], message.params[1]);

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
                            this.log.info(`[${channel}] ${message.params[1]}`);
                            this.emit("notice", channel, message.tags["msg-id"], message.params[1]);
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
                        this.log.info(`[${channel}] Exited host mode.`);
                        this.emits(["unhost", "_promiseUnhost"], [[channel, message.params[1].split(" ")[1] || "0"], [null]]);
                    }
                    // Now hosting..
                    else {
                        var viewers = message.params[1].split(" ")[1] || 0;
                        if (!_.isInteger(viewers)) { viewers = 0; }

                        this.log.info(`[${channel}] Now hosting ${message.params[1].split(" ")[0]} for ${viewers} viewer(s).`);
                        this.emit("hosting", channel, message.params[1].split(" ")[0], viewers);
                    }
                    break;

                // Someone has been timed out or chat has been cleared by a moderator..
                case "CLEARCHAT":
                    // User has been timed out by a moderator..
                    if (message.params.length > 1) {
                        this.log.info(`[${channel}] ${message.params[1]} has been timed out.`);
                        this.emit("timeout", channel, message.params[1]);
                    }
                    // Chat was cleared by a moderator..
                    else {
                        this.log.info(`[${channel}] Chat was cleared by a moderator.`);
                        this.emits(["clearchat", "_promiseClear"], [[channel], [null]]);
                    }
                    break;

                case "RECONNECT":
                    this.log.info("Received RECONNECT request from Twitch..");
                    this.log.info(`Disconnecting and reconnecting in ${this.reconnectTimer / 1000} seconds..`);
                    this.disconnect();
                    setTimeout(() => { this.connect(); }, this.reconnectTimer);
                    break;

                case "SERVERCHANGE":
                    this.log.warn(`Channel ${channel} isn't or no longer located on this cluster.`);
                    this.log.warn(`Read more: https://www.tmijs.org/forums/index.php?/topic/39-channel-specific-chat-server-clusters/`);
                    this.emit("serverchange", channel);
                    break;

                // Received when joining a channel and every time you send a PRIVMSG to a channel.
                case "USERSTATE":
                    message.tags.username = this.username;
                    // Add the client to the moderators of this room..
                    if (message.tags["user-type"] === "mod") {
                        if (!this.moderators[this.lastJoined]) { this.moderators[this.lastJoined] = []; }
                        if (this.moderators[this.lastJoined].indexOf(this.username) < 0) { this.moderators[this.lastJoined].push(this.username); }
                    }

                    if (!this.getUsername().includes("justinfan") && !this.userstate[channel]) {
                        this.userstate[channel] = message.tags;
                        this.lastJoined = channel;
                        this.channels.push(channel);
                        this.log.info("Joined " + channel);
                        this.emits(["join", "_promiseJoin"], [[channel, _.username(this.getUsername())], [null]]);
                    }

                    this.userstate[channel] = message.tags;
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
                    this.emit("roomstate", channel, message.tags);

                    // This room is now in slow mode. You may send messages every slow_duration seconds.
                    if (message.tags.hasOwnProperty("slow") && !message.tags.hasOwnProperty("subs-only")) {
                        if (typeof message.tags.slow === "boolean") {
                            this.log.info(`[${channel}] This room is no longer in slow mode.`);
                            this.emits(["slow", "slowmode", "_promiseSlowoff"], [[channel, false, "0"], [channel, false, "0"], [null]]);
                        } else {
                            this.log.info(`[${channel}] This room is now in slow mode.`);
                            this.emits(["slow", "slowmode", "_promiseSlow"], [[channel, true, message.tags.slow], [channel, true, message.tags.slow], [null]]);
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
                        if (!this.moderators[channel]) { this.moderators[channel] = []; }
                        if (this.moderators[channel].indexOf(message.params[2]) < 0) { this.moderators[channel].push(message.params[2]); }

                        this.emit("mod", channel, message.params[2]);
                    }
                    else if (message.params[1] === "-o") {
                        // Remove username from the moderators..
                        if (!this.moderators[channel]) { this.moderators[channel] = []; }
                        this.moderators[channel].filter((value) => { return value != message.params[2]; });

                        this.emit("unmod", channel, message.params[2]);
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
                        this.lastJoined = channel;
                        this.channels.push(channel);
                        this.log.info(`Joined ${channel}`);
                        this.emits(["join", "_promiseJoin"], [[channel, message.prefix.split("!")[0]], [null]]);
                    }

                    if (this.username !== message.prefix.split("!")[0]) {
                        this.emit("join", channel, message.prefix.split("!")[0]);
                    }

                    break;

                case "PART":
                    if (this.username === message.prefix.split("!")[0]) {
                        if (this.userstate[channel]) { delete this.userstate[channel]; }
                        var index = this.channels.indexOf(channel);
                        if (index !== -1) { this.channels.splice(index, 1); }
                        this.log.info(`Left ${channel}`);
                        this.emit("_promisePart", null);
                    }
                    this.emit("part", channel, message.prefix.split("!")[0]);
                    break;

                case "WHISPER":
                    this.log.info(`[WHISPER] <${message.prefix.split("!")[0]}>: ${message.params[1]}`);

                    if (!message.tags.hasOwnProperty("username")) { message.tags.username = message.prefix.split("!")[0]; }
                    message.tags["message-type"] = "whisper";

                    this.emits(["whisper", "message"], [[message.tags, message.params[1]], [null, message.tags, message.params[1], false]]);
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
                            this.emit("subscription", channel, message.params[1].split(" ")[0]);
                        }
                        // Subanniversary..
                        else if (message.params[1].includes("subscribed") && message.params[1].includes("in a row")) {
                            var splitted = message.params[1].split(" ");
                            var length = splitted[splitted.length - 5];

                            this.emit("subanniversary", channel, splitted[0], length);
                        }
                    }

                    // Message from JTV..
                    else if (message.tags.username === "jtv") {
                        // Someone is hosting my channel..
                        if (message.params[1].includes("is now hosting you for")) {
                            this.emit("hosted", channel, _.username(message.params[1].split(" ")[0]), message.params[1].split(" ")[6]);
                        }
                        else if (message.params[1].includes("is now hosting you")) {
                            this.emit("hosted", channel, _.username(message.params[1].split(" ")[0]), 0);
                        }
                    }

                    else {
                        // Message is an action..
                        if (message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                            message.tags["message-type"] = "action";
                            this.log.info(`[${channel}] *<${message.tags.username}>: ${message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]}`);
                            this.emits(["action", "message"], [
                                [channel, message.tags, message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], false],
                                [channel, message.tags, message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], false]
                            ]);
                        }
                        // Message is a regular message..
                        else {
                            message.tags["message-type"] = "chat";
                            this.log.info(`[${channel}] <${message.tags.username}>: ${message.params[1]}`);
                            this.emits(["chat", "message"], [
                                [channel, message.tags, message.params[1], false],
                                [channel, message.tags, message.params[1], false]
                            ]);
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
        this.reconnect = _.get(this.opts.connection.reconnect, false);
        this.server = _.get(this.opts.connection.server, "RANDOM");
        this.port = _.get(this.opts.connection.port, 80);
        this.secure = _.get(this.opts.connection.secure, false);

        // Override port because we are using a secure connection..
        if (this.secure) { this.port = 443; }
        if (this.port === 443) { this.secure = true; }

        this.reconnectTimer = this.reconnectTimer + 10000;
        if (this.reconnectTimer >= 60000) {
            this.reconnectTimer = 60000;
        }

        // Connect to a random server..
        if (this.server === "RANDOM" || typeof this.opts.connection.cluster !== "undefined") {
            var cluster = _.get(this.opts.connection.cluster, "aws");

            // Default type is "aws" server..
            _.server(cluster, this.secure, (addr) => {
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
    this.ws = new ws(`${this.secure ? "wss" : "ws"}://${this.server}:${this.port}/`, "irc");

    this.ws.onmessage = this._onMessage.bind(this);
    this.ws.onerror = this._onError.bind(this);
    this.ws.onclose = this._onClose.bind(this);
    this.ws.onopen = this._onOpen.bind(this);
};

// Called when the WebSocket connection's readyState changes to OPEN.
// Indicates that the connection is ready to send and receive data..
client.prototype._onOpen = function _onOpen() {
    if (!_.isNull(this.ws) && this.ws.readyState === 1) {
        // Emitting "connecting" event..
        this.log.info(`Connecting to ${this.server} on port ${this.port}..`);
        this.emit("connecting", this.server, this.port);

        this.username = _.get(this.opts.identity.username, _.justinfan());
        this.password = _.password(_.get(this.opts.identity.password, "SCHMOOPIIE"));

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
        this.emits(["_promiseConnect", "disconnected"], [[this.reason], [this.reason]]);
    } else {
        this.reason = "Connection closed.";
        this.log.error(this.reason);
        this.emits(["_promiseConnect", "disconnected"], [[this.reason], [this.reason]]);
    }

    if (this.reconnect && !this.reconnecting) {
        this.reconnecting = true;
        this.log.error(`Trying to reconnect in ${this.reconnectTimer / 1000} seconds..`);
        this.emit("reconnect");
        setTimeout(() => { this.reconnecting = false; this.connect(); }, this.reconnectTimer);
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
        this.emits(["_promiseConnect", "_promiseDisconnect", "disconnected"], [[this.reason], [null], [this.reason]]);
    }
    // Got disconnected from server..
    else {
        this.emits(["_promiseConnect", "disconnected"], [[this.reason], [this.reason]]);

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
        _.promiseDelay(delay).then(() => { reject("No response from Twitch."); });

        if (!_.isNull(this.ws) && this.ws.readyState !== 2 && this.ws.readyState !== 3) {
            if (!_.isNull(channel)) {
                this.log.info(`[${_.channel(channel)}] Executing command: ${command}`);
                this.ws.send(`PRIVMSG ${_.channel(channel)} :${command}`);
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
            if (!this.userstate[_.channel(channel)]) {
                this.userstate[_.channel(channel)] = {}
            }

            if (message.length >= 500) {
                var msg = _.splitLine(message, 500);
                message = msg[0];

                setTimeout(() => {
                    this._sendMessage(delay, channel, msg[1]);
                }, 350);
            }

            this.ws.send("PRIVMSG " + _.channel(channel) + " :" + message);

            if (message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                this.userstate[_.channel(channel)]["message-type"] = "action";
                this.log.info(`[${_.channel(channel)}] *<${this.getUsername()}>: ${message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]}`);
                this.emits(["action", "message"], [
                    [_.channel(channel), this.userstate[_.channel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], true],
                    [_.channel(channel), this.userstate[_.channel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1], true]
                ]);
            }
            else {
                this.userstate[_.channel(channel)]["message-type"] = "chat";
                this.log.info(`[${_.channel(channel)}] <${this.getUsername()}>: ${message}`);
                this.emits(["chat", "message"], [
                    [_.channel(channel), this.userstate[_.channel(channel)], message, true],
                    [_.channel(channel), this.userstate[_.channel(channel)], message, true]
                ]);
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
    if (!this.moderators[_.channel(channel)]) { this.moderators[_.channel(channel)] = []; }
    if (this.moderators[_.channel(channel)].indexOf(_.username(username)) >= 0) {
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
    levenshtein: function levenshtein(s1, s2, caseSensitive) {
        var cost_ins = 1;
        var cost_rep = 1;
        var cost_del = 1;
        caseSensitive = _.get(caseSensitive, false);

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
            if (!this.raffleChannels[_.channel(channel)]) { this.raffleChannels[_.channel(channel)] = []; }
        },
        enter: function enter(channel, username) {
            this.init(channel);
            this.raffleChannels[_.channel(channel)].push(username.toLowerCase());
        },
        leave: function leave(channel, username) {
            this.init(channel);
            var index = this.raffleChannels[_.channel(channel)].indexOf(_.username(username));
            if (index >= 0) {
                this.raffleChannels[_.channel(channel)].splice(index, 1);
                return true;
            }
            return false;
        },
        pick: function pick(channel) {
            this.init(channel);
            var count = this.raffleChannels[_.channel(channel)].length;
            if (count >= 1) {
                return this.raffleChannels[_.channel(channel)][Math.floor((Math.random() * count))];
            }
            return null;
        },
        reset: function reset(channel) {
            this.init(channel);
            this.raffleChannels[_.channel(channel)] = [];
        },
        count: function count(channel) {
            this.init(channel);
            if (this.raffleChannels[_.channel(channel)]) {
                return this.raffleChannels[_.channel(channel)].length;
            }
            return 0;
        },
        isParticipating: function isParticipating(channel, username) {
            this.init(channel);
            if (this.raffleChannels[_.channel(channel)].indexOf(_.username(username)) >= 0) {
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

// Expose everything, for browser and Node.js / io.js
if (typeof module !== "undefined" && module.exports) {
    module.exports = client;
}
if (typeof window !== "undefined") {
    window.irc = {};
    window.irc.client = client;
}
