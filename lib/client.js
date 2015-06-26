var bunyan = require("bunyan");
var cron = require("cron");
var eventEmitter = require("events").EventEmitter;
var irc = require("irc");
var parse = require("irc-message").parse;
var timer = require("./timer");
var server = require("./server");
var util = require("util");
var utils = require("./utils");
var vow = require("vow");
var webSocket = require("ws");

function rawStream() {}

// Custom formatting for logger..
rawStream.prototype.write = function (rec) {
    var message = rec.msg || rec.raw;

    if(typeof message === "object" && message !== null) {
        message = JSON.stringify(message);
    }

    var hours = rec.time.getHours();
    var minutes = rec.time.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";

    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    console.log("[%s] %s: %s", hours + ":" + minutes + ampm, bunyan.nameFromLevel[rec.level], message);
};

// Client instance..
var client = function client(opts) {
    this.setMaxListeners(0);
    
    this.opts = (typeof opts !== "undefined") ? opts : {};
    this.opts.channels = opts.channels || [];
    this.opts.connection = opts.connection || {};
    this.opts.identity = opts.identity || {};
    this.opts.options = opts.options || {};

    this.irc = null;
    this.lastJoined = "";
    this.moderators = {};
    this.protocol = "websocket";
    this.usingWebSocket = true;
    this.username = "";
    this.userstate = {};
    this.wasCloseCalled = false;
    this.ws = null;

    // Create the logger..
    this.log = bunyan.createLogger({
        name: "tmi.js",
        streams: [
            {
                level: "error",
                stream: new rawStream(),
                type: "raw"
            }
        ]
    });

    // Show debug messages ?
    if (typeof this.opts.options.debug !== "undefined" ? this.opts.options.debug : false) { this.log.level("info"); }

    eventEmitter.call(this);
}

util.inherits(client, eventEmitter);

// Handle parsed chat server message..
client.prototype.handleMessage = function handleMessage(message) {
    var self = this;

    // Parse emotes..
    if (typeof message.tags['emotes'] === 'string') {
        var emoticons = message.tags['emotes'].split('/');
        var emotes = {};

        for (var i = 0; i < emoticons.length; i++) {
            var parts = emoticons[i].split(':');
            emotes[parts[0]] = parts[1].split(',');
        }
        message.tags['emotes'] = emotes;
    } else { message.tags['emotes'] = null; }
    
    // Transform the IRCv3 tags..
    if (message.tags) {
        for(var key in message.tags) {
           if (typeof message.tags[key] === "boolean") { message.tags[key] = null; }
           else if (message.tags[key] === "1") { message.tags[key] = true; }
           else if (message.tags[key] === "0") { message.tags[key] = false; }
        }
    }
    
    // Messages with no prefix..
    if (message.prefix === null) {
        switch(message.command) {
            // Received PING from server..
            case "PING":
                self.emit("ping");
                self.ws.send("PONG");
                break;

            // Received PONG from server, return current latency
            case "PONG":
                self.emit("pong");
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
                self.emit("connected", self.server, self.port);

                self.ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");

                // Join all the channels from configuration every 2 seconds..
                var joinQueue = new timer.queue(2000);

                for (var i = 0; i < self.opts.channels.length; i++) {
                    joinQueue.add(function(i) {
                        if (self.usingWebSocket && self.ws !== null && self.ws.readyState !== 2 && self.ws.readyState !== 3) {
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

                    // This room is now in slow mode. You may send messages every slow_duration seconds.
                    case "slow_on":
                        // TODO: Display seconds..
                        self.log.info("[" + message.params[0] + "] This room is now in slow mode.");
                        self.emit("slow", message.params[0], true);
                        self.emit("slowmode", message.params[0], true);
                        break;

                    // This room is no longer in slow mode.
                    case "slow_off":
                        self.log.info("[" + message.params[0] + "] This room is no longer in slow mode.");
                        self.emit("slow", message.params[0], false);
                        self.emit("slowmode", message.params[0], false);
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

                    // Ignore this because we are already listening to HOSTTARGET.
                    case "host_on":
                    case "host_off":
                        //
                        break;
                }

                if (message.params[1].indexOf("Login unsuccessful") >= 0) {
                    self.wasCloseCalled = true;
                    self.log.error("Login unsuccessful.");
                    self.ws.close();
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
                self.log.info("Disconnecting and reconnecting in 10 seconds..");
                self.disconnect();
                setTimeout(function() { self.connect(); }, 10000);
                break;

            // Received when joining a channel and every time you send a PRIVMSG to a channel.
            case "USERSTATE":
                message.tags.username = self.username;
                self.userstate[message.params[0]] = message.tags;
                
                // Add the client to the moderators of this room..
                if (message.tags["user-type"] !== null) {
                    if (!self.moderators[self.lastJoined]) { self.moderators[self.lastJoined] = []; }
                    if (self.moderators[self.lastJoined].indexOf(self.username) < 0) { self.moderators[self.lastJoined].push(self.username); }
                }
                break;
                
            // Will be used in the future to describe non-channel-specific state information.
            // Source: https://github.com/justintv/Twitch-API/blob/master/chat/capabilities.md#globaluserstate
            case "GLOBALUSERSTATE":
                self.log.warn("Could not parse message from tmi.twitch.tv:");
                self.log.warn(message);
                break;
                
            case "ROOMSTATE":
                self.emit("roomstate", message.params[0], message.tags);
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
                if (self.username === message.prefix.split("!")[0]) {
                    self.lastJoined = message.params[0];
                    self.log.info("Joined " + message.params[0]);
                }
                self.emit("join", message.params[0], message.prefix.split("!")[0]);
                break;

            case "PART":
                if (self.username === message.prefix.split("!")[0]) {
                    self.log.info("Left " + message.params[0]);
                }
                self.emit("part", message.params[0], message.prefix.split("!")[0]);
                break;

            case "PRIVMSG":
                // Add username (lowercase) to the tags..
                message.tags.username = message.prefix.split("!")[0];

                // Message is an action..
                if (message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                    self.log.info("[" + message.params[0] + "] *<" + message.tags.username + ">: " + message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                    self.emit("action", message.params[0], message.tags, message.params[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                }
                // Message is a regular message..
                else {
                    self.log.info("[" + message.params[0] + "] <" + message.tags.username + ">: " + message.params[1]);
                    self.emit("chat", message.params[0], message.tags, message.params[1]);
                }
                
                // Message from TwitchNotify..
                if (message.tags.username === "twitchnotify") {
                    // Someone subscribed to a hosted channel. Who cares.
                    if (message.params[1].indexOf("subscribed to") >= 0) {
                        //
                    }
                    // New subscriber..
                    else if (message.params[1].indexOf("just subscribed") >= 0) {
                        self.emit('subscription', message.params[0], message.params[1].split(' ')[0]);
                    }
                    // Subanniversary..
                    else if (message.params[1].indexOf("subscribed") >= 0 && message.params[1].indexOf("in a row") >= 0) {
                        var splitted = message.params[1].split(' ');
                        var length = splitted[splitted.length - 5];
                        
                        self.emit('subanniversary', message.params[0], splitted[0], length);
                    }
                }
                
                // Message from JTV..
                else if (message.tags.username === "jtv") {
                    // Client sent /mods command to channel..
                    if (message.params[1].indexOf("moderators of this room are") >= 0) {
                        var splitted = message.params[1].split(':');
                        var mods = splitted[1].replace(/,/g, '').split(':').toString().toLowerCase().split(' ');

                        for(var i = mods.length - 1; i >= 0; i--) {
                            if(mods[i] === '') {
                                mods.splice(i, 1);
                            }
                        }
                        
                        self.emit('mods', message.params[0], mods);
                        self.emit('modspromises', message.params[0], mods);
                    }
                    // Someone is hosting my channel..
                    else if (message.params[1].indexOf("is now hosting you") >= 0) {
                        self.emit('hosted', message.params[0], utils.normalizeUsername(message.params[1].split(' ')[0]));
                    }
                }
                break;

            default:
                self.log.warn("Could not parse message:");
                self.log.warn(message);
                break;
        }
    }
};

// Handle parsed group server messages.. (IRC PROTOCOL)
client.prototype.handleGroupMessage = function handleGroupMessage(message) {
    var self = this;
    
    // Messages with no prefix..
    if (typeof message.prefix === "undefined") {
        switch(message.rawCommand) {
            // Received PING from server..
            case "PING":
                self.emit("ping");
                self.irc.send("PONG");
                break;

            // Received PONG from server, return current latency
            case "PONG":
                self.emit("pong");
                break;

            default:
                self.log.warn("Could not parse message with no prefix:");
                self.log.warn(JSON.stringify(message));
                break;
        }
    }
    
    // Messages with "tmi.twitch.tv" as a prefix..
    else if (message.prefix === "tmi.twitch.tv") {
        switch(message.rawCommand) {
            case "001":
                self.username = message.args[0];
                break;
            case "002":
            case "003":
            case "004":
            case "375":
            case "376":
            case "CAP":
                break;
            case "372":
                self.log.info("Connected to server.");
                self.emit("connected", self.server, self.port);

                self.irc.send("CAP REQ", ":twitch.tv/tags twitch.tv/commands twitch.tv/membership");

                // Join all the channels from configuration every 2 seconds..
                var joinQueue = new timer.queue(2000);

                for (var i = 0; i < self.opts.channels.length; i++) {
                    joinQueue.add(function(i) {
                        if (self.irc !== null && self.protocol === "irc") {
                            self.irc.join(utils.normalizeChannel(self.opts.channels[i]));
                        }
                    }.bind(this, i));
                }

                joinQueue.run();
                break;
                
            // Someone has been timed out or chat has been cleared by a moderator..
            case "CLEARCHAT":
                // User has been timed out by a moderator..
                if (message.args.length > 1) {
                    self.log.info("[" + message.args[0] + "] " + message.args[1] + " has been timed out.");
                    self.emit("timeout", message.args[0], message.args[1]);
                }
                // Chat was cleared by a moderator..
                else {
                    self.log.info("[" + message.args[0] + "] Chat was cleared by a moderator.");
                    self.emit("clearchat", message.args[0]);
                }
                break;
                
            // Received when joining a channel and every time you send a PRIVMSG to a channel.
            case "USERSTATE":
                self.userstate[message.args[0]] = {username: self.username};
                break;
                
            // Received when joining a channel..
            case "ROOMSTATE":
                // Our tests returned nothing very important with this message, so we will ignore it for now.
                break;
                
            case "NOTICE":
                // Client sent /mods command to channel..
                if (message.args[1].indexOf("moderators of this room are") >= 0) {
                    var splitted = message.args[1].split(':');
                    var mods = splitted[1].replace(/,/g, '').split(':').toString().toLowerCase().split(' ');

                    for(var i = mods.length - 1; i >= 0; i--) {
                        if(mods[i] === '') {
                            mods.splice(i, 1);
                        }
                    }
                    
                    self.emit('mods', message.args[0], mods);
                    self.emit('modspromises', message.args[0], mods);
                }
                else if (message.args[1].indexOf("cannot whisper to yourself") >= 0) {
                    self.log.error(message.args[1]);
                }
                else if (message.args[1].indexOf("sending whispers too fast") >= 0) {
                    self.log.error(message.args[1]);
                }
                else {
                    self.log.warn("Could not parse message from tmi.twitch.tv:");
                    self.log.warn(JSON.stringify(message));
                }
                break;
            default:
                self.log.warn("Could not parse message from tmi.twitch.tv:");
                self.log.warn(JSON.stringify(message));
                break;
        }
    }
    
    // Anything else..
    else {
        switch(message.rawCommand) {
            case "353":
                self.emit("names", message.args[2], message.args[3].split(" "));
                break;
            case "366":
                break;
            case "JOIN":
                if (self.username === message.prefix.split("!")[0]) {
                    self.lastJoined = message.args[0];
                    if (!self.moderators[self.lastJoined]) { self.moderators[self.lastJoined] = []; }
                    
                    self.log.info("Joined " + message.args[0]);
                }
                self.emit("join", message.args[0], message.prefix.split("!")[0]);
                break;
            case "PART":
                if (self.username === message.prefix.split("!")[0]) {
                    // Remove username from the moderators..
                    if (!self.moderators[message.args[0]]) { self.moderators[message.args[0]] = []; }
                    self.moderators[message.args[0]].filter(function(value) { return value != self.username; });
                    
                    self.log.info("Left " + message.args[0]);
                }
                self.emit("part", message.args[0], message.prefix.split("!")[0]);
                break;
            case "WHISPER":
                self.log.info("[WHISPER] <" + message.prefix.split("!")[0] + ">: " + message.args[1]);
                self.emit("whisper", message.prefix.split("!")[0], message.args[1]);
                break;
            case "PRIVMSG":
                message.tags = {};
                message.tags.username = message.prefix.split("!")[0];
                
                // Message is an action..
                if (message.args[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                    self.log.info("[" + message.args[0] + "] *<" + message.tags.username + ">: " + message.args[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                    self.emit("action", message.args[0], message.tags, message.args[1].match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                }
                // Message is a regular message..
                else {
                    self.log.info("[" + message.args[0] + "] <" + message.tags.username + ">: " + message.args[1]);
                    self.emit("chat", message.args[0], message.tags, message.args[1]);
                }
                break;
            default:
                self.log.warn("Could not parse message:");
                self.log.warn(JSON.stringify(message));
                break;
        }
    }
}

// Connect to server..
client.prototype.connect = function connect() {
    var self = this;
    var deferred = vow.defer();
    
    this.reconnect = typeof this.opts.connection.reconnect !== "undefined" ? this.opts.connection.reconnect : false;
    this.server = typeof this.opts.connection.server !== "undefined" ? this.opts.connection.server : "RANDOM";
    this.port = typeof this.opts.connection.port !== "undefined" ? this.opts.connection.port : 443;

    // Connect to a random server..
    if (this.server === "RANDOM" || typeof this.opts.connection.random !== "undefined") {
        // Default type is "chat" server..
        server.getRandomServer(typeof self.opts.connection.random !== "undefined" ? self.opts.connection.random : "chat", function (addr, protocol) {
            self.server = addr.split(":")[0];
            self.port = addr.split(":")[1];
            self.protocol = protocol;

            self._openConnection(self.protocol);
            deferred.resolve();
        });
    }
    // Connect to server from configuration..
    else {
        this._openConnection(self.protocol);
        deferred.resolve();
    }
    
    return deferred.promise();
};

// Open a connection..
client.prototype._openConnection = function _openConnection(protocol) {
    var self = this;

    // Shall we try an IRC connection ?
    if (protocol === "irc") {
        if (typeof window === "undefined") { self._openIRCConnection(); }
        else { self.log.error("Server is not accepting WebSocket connections."); }
    }
    else {
        server.isWebSocket(self.server, self.port, function(accepts) {
            // Server is accepting WebSocket connections..
            if (accepts) {
                self.usingWebSocket = true;
                self.ws = new webSocket("ws://" + self.server + ":" + self.port + "/", "irc");
    
                self.ws.onmessage = self._onMessage.bind(self);
                self.ws.onerror = self._onError.bind(self);
                self.ws.onclose = self._onClose.bind(self);
                self.ws.onopen = self._onOpen.bind(self);
            }
            // Server is not accepting WebSocket connections..
            else {
                // Perhaps we should try using IRC protocol instead..
                if (self.protocol === "websocket" && typeof window === "undefined") {
                    self.protocol = "irc";
                    self.log.error("Server is not accepting WebSocket connections. Reconnecting using IRC protocol..");
                    self.emit("reconnect");
                    setTimeout(function() { self.connect(); }, 3000);
                }
                else if (self.reconnect) {
                    self.log.error("Server is not accepting WebSocket connections. Reconnecting in 10 seconds..");
                    self.emit("reconnect");
                    setTimeout(function() { self.connect(); }, 10000);
                } else {
                    self.log.error("Server is not accepting WebSocket connections.");
                }
            }
        });
    }
};

client.prototype._openIRCConnection = function _openIRCConnection() {
    var self = this;
    
    // Emitting "connecting" event..
    this.log.info("Connecting to %s on port %s..", this.server, this.port);
    this.emit("connecting", this.server, this.port);

    this.username = typeof this.opts.identity.username !== "undefined" ? this.opts.identity.username : utils.generateJustinfan();
    this.password = typeof this.opts.identity.password !== "undefined" ? this.opts.identity.password : "SCHMOOPIIE";

    // Make sure "oauth:" is included..
    if (this.password !== "SCHMOOPIIE" && this.password.indexOf("oauth:") < 0) {
        this.password = "oauth:" + this.password;
    }
    
    this.irc = new irc.Client(self.server, self.username, {
        password: self.password,
        port: self.port
    });
    
    this.irc.on('raw', function (message) {
        self.handleGroupMessage(message);
    });
}

// Called when the WebSocket connection's readyState changes to OPEN.
// Indicates that the connection is ready to send and receive data..
client.prototype._onOpen = function _onOpen() {
    // Emitting "connecting" event..
    this.log.info("Connecting to %s on port %s..", this.server, this.port);
    this.emit("connecting", this.server, this.port);

    this.username = typeof this.opts.identity.username !== "undefined" ? this.opts.identity.username : utils.generateJustinfan();
    this.password = typeof this.opts.identity.password !== "undefined" ? this.opts.identity.password : "SCHMOOPIIE";

    // Make sure "oauth:" is included..
    if (this.password !== "SCHMOOPIIE" && this.password.indexOf("oauth:") < 0) {
        this.password = "oauth:" + this.password;
    }

    // Emitting "logon" event..
    this.log.info("Sending authentication to server..");
    this.emit("logon");

    // Authentication..
    this.ws.send("PASS " + this.password);
    this.ws.send("NICK " + this.username);
    this.ws.send("USER " + this.username + " 8 * :" + this.username);
};

// Called when a message is received from the server..
client.prototype._onMessage = function _onMessage(event) {
    this.handleMessage(parse(event.data.replace("\r\n", "")));
};

// Called when an error occurs..
client.prototype._onError = function _onError() {
    this.moderators = {};
    
    if (this.ws !== null) {
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
            this.log.error("Sorry, we were unable to connect to chat. Reconnecting in 10 seconds..");
            this.emit("reconnect");
            setTimeout(function() { self.connect(); }, 10000);
        } else {
            this.log.error("Sorry, we were unable to connect to chat.");
        }
    }
};

// Send a command to the server..
client.prototype._sendCommand = function _sendCommand(channel, command) {
    var self = this;
    
    if (this.protocol === "irc") {
        return this._sendCommandIRC(channel, command);
    }
    
    // Promise a result..
    return new vow.Promise(function(resolve, reject, notify) {
        if (self.usingWebSocket && self.ws !== null && self.ws.readyState !== 2 && self.ws.readyState !== 3 && self.getUsername().indexOf("justinfan") < 0) {
            switch (command.toLowerCase()) {
                case "/mods":
                case ".mods":
                    self.log.info("Executing command: " + command);
                    self.once("modspromises", function (channel, mods) {
                        // Add the username to the moderators of this room..
                        mods.forEach(function(username) {
                            if (!self.moderators[channel]) { self.moderators[channel] = []; }
                            if (self.moderators[channel].indexOf(username) < 0) { self.moderators[channel].push(username); }
                        });
                        resolve(mods);
                    });
                    self.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + command);
                    break;
                default:
                    if (channel !== null) {
                        self.log.info("[" + utils.normalizeChannel(channel) + "] Executing command: " + command);
                        self.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + command);
                    } else {
                        self.log.info("Executing command: " + command);
                        self.ws.send(command);
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
    
    if (this.protocol === "irc") {
        return this._sendMessageIRC(channel, message);
    }
    
    // Promise a result..
    return new vow.Promise(function(resolve, reject, notify) {
        if (self.usingWebSocket && self.ws !== null && self.ws.readyState !== 2 && self.ws.readyState !== 3 && self.getUsername().indexOf("justinfan") < 0) {
            self.ws.send("PRIVMSG " + utils.normalizeChannel(channel) + " :" + message);
            
            if (message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                self.log.info("[" + utils.normalizeChannel(channel) + "] *<" + self.getUsername() + ">: " + message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                self.emit("action", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
            } else {
                self.log.info("[" + utils.normalizeChannel(channel) + "] <" + self.getUsername() + ">: " + message);
                self.emit("chat", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message);
            }
            resolve();
        } else {
            reject();
        }
    });
};

// Send a command to the IRC server..
client.prototype._sendCommandIRC = function _sendCommandIRC(channel, command) {
    var self = this;
    
    // Promise a result..
    return new vow.Promise(function(resolve, reject, notify) {
        if (self.irc !== null && self.protocol === "irc" && self.getUsername().indexOf("justinfan") < 0) {
            switch (command.toLowerCase()) {
                case "/mods":
                case ".mods":
                    self.log.info("Executing command: " + command);
                    self.once("modspromises", function (channel, mods) {
                        // Add the username to the moderators of this room..
                        mods.forEach(function(username) {
                            if (!self.moderators[channel]) { self.moderators[channel] = []; }
                            if (self.moderators[channel].indexOf(username) < 0) { self.moderators[channel].push(username); }
                        });
                        resolve(mods);
                    });
                    self.irc.say(utils.normalizeChannel(channel), command);
                    break;
                default:
                    if (channel !== null) {
                        self.log.info("[" + utils.normalizeChannel(channel) + "] Executing command: " + command);
                        self.irc.say(utils.normalizeChannel(channel), command);
                    } else {
                        self.log.info("Executing command: " + command);
                        self.irc.send(command);
                    }
                    resolve();
                    break;
            }
        } else {
            reject();
        }
    });
};

// Send a message to the IRC server..
client.prototype._sendMessageIRC = function _sendMessageIRC(channel, message) {
    var self = this;
    
    // Promise a result..
    return new vow.Promise(function(resolve, reject, notify) {
        if (self.irc !== null && self.protocol === "irc" && self.getUsername().indexOf("justinfan") < 0) {
            self.irc.say(utils.normalizeChannel(channel), message);
            
            if (message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) {
                self.log.info("[" + utils.normalizeChannel(channel) + "] *<" + self.getUsername() + ">: " + message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
                self.emit("action", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1]);
            } else {
                self.log.info("[" + utils.normalizeChannel(channel) + "] <" + self.getUsername() + ">: " + message);
                self.emit("chat", utils.normalizeChannel(channel), self.userstate[utils.normalizeChannel(channel)], message);
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
    if (this.moderators[utils.normalizeChannel(channel)].indexOf(utils.normalizeUsername(username)) >= 0) {
        return true;
    }
    return false;
};

// Disconnect from server..
client.prototype.disconnect = function disconnect() {
    var deferred = vow.defer();
    
    if (this.protocol === "websocket") {
        if (this.usingWebSocket && this.ws !== null && this.ws.readyState !== 3) {
            this.wasCloseCalled = true;
            this.log.info("Disconnecting from server..");
            this.ws.close();
            deferred.resolve();
        } else {
            this.log.error("Cannot disconnect from server. Socket is not opened or connection is already closing.");
            deferred.reject();
        }
    }
    else if (this.protocol === "irc") {
        if (this.irc !== null) {
            this.wasCloseCalled = true;
            this.log.info("Disconnecting from server..");
            this.irc.disconnect();
            deferred.resolve();
        } else {
            this.log.error("Cannot disconnect from server. Connection is not opened.");
            deferred.reject();
        }
    }
    
    return deferred.promise();
};

client.prototype.action = function action(channel, message) {
    message = "\u0001ACTION " + message + "\u0001";
    return this._sendMessage(channel, message);
};

client.prototype.ban = function ban(channel, username) {
    return this._sendCommand(channel, "/ban " + utils.normalizeUsername(username));
};

client.prototype.clear = function clear(channel) {
    return this._sendCommand(channel, "/clear");
};

client.prototype.color = function color(channel, color) {
    return this._sendCommand(channel, "/color " + color);
};

client.prototype.commercial = function commercial(channel, seconds) {
    seconds = typeof seconds !== 'undefined' ? seconds : 30;
    return this._sendCommand(channel, "/commercial " + seconds);
};

client.prototype.host = function host(channel, target) {
    return this._sendCommand(channel, "/host " + utils.normalizeUsername(target));
};

client.prototype.join = function join(channel) {
    return this._sendCommand(null, "JOIN " + utils.normalizeChannel(channel));
};

client.prototype.mod = function mod(channel, username) {
    return this._sendCommand(channel, "/mod " + utils.normalizeUsername(username));
};

client.prototype.mods = function mods(channel) {
    return this._sendCommand(channel, "/mods");
};

client.prototype.part = client.prototype.leave = function part(channel) {
    return this._sendCommand(null, "PART " + utils.normalizeChannel(channel));
};

client.prototype.ping = function ping() {
    return this._sendCommand(null, "PING");
};

client.prototype.r9kbeta = client.prototype.r9kmode = function r9kbeta(channel) {
    return this._sendCommand(channel, "/r9kbeta");
};

client.prototype.r9kbetaoff = client.prototype.r9kmodeoff = function r9kbetaoff(channel) {
    return this._sendCommand(channel, "/r9kbetaoff");
};

client.prototype.raw = function raw(message) {
    return this._sendCommand(null, message);
};

client.prototype.say = function say(channel, message) {
    return this._sendMessage(channel, message);
};

client.prototype.slow = client.prototype.slowmode = function slow(channel, seconds) {
    seconds = typeof seconds !== 'undefined' ? seconds : 300;
    
    return this._sendCommand(channel, "/seconds " + seconds);
};

client.prototype.slowoff = client.prototype.slowmodeoff = function slowoff(channel) {
    return this._sendCommand(channel, "/slowoff");
};

client.prototype.subscribers = function subscribers(channel) {
    return this._sendCommand(channel, "/subscribers");
};

client.prototype.subscribersoff = function subscribersoff(channel) {
    return this._sendCommand(channel, "/subscribersoff");
};

client.prototype.timeout = function timeout(channel, username, seconds) {
    seconds = typeof seconds !== 'undefined' ? seconds : 300;
    username = typeof username !== 'undefined' ? username : "Kappa";
    
    return this._sendCommand(channel, "/timeout " + username + " " + seconds);
};

client.prototype.unban = function unban(channel, username) {
    return this._sendCommand(channel, "/unban " + utils.normalizeUsername(username));
};

client.prototype.unhost = function unhost(channel) {
    return this._sendCommand(channel, "/unhost");
};

client.prototype.unmod = function unmod(channel, username) {
    return this._sendCommand(channel, "/unmod " + utils.normalizeUsername(username));
};

client.prototype.whisper = function whisper(username, message) {
    return this._sendMessage("#jtv", "/w " + utils.normalizeUsername(username) + " " + message);
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
        caseSensitive = typeof caseSensitive !== 'undefined' ? caseSensitive : false;

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
            split = !('0')[0];
        } catch (e) {
            split = true;
        }
        if (split) {
            s1 = s1.split('');
            s2 = s2.split('');
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
        if (u_let !== null) {
            return (u_let.length / chars);
        }
        return 0;
    }
};

// Expose everything, for browser and Node.js / io.js
if (typeof window !== "undefined") {
    window.irc = {};
    window.irc.client = client;
} else {
    module.exports = client;
}
