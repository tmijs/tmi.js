var bunyan = require("bunyan");
var eventEmitter = require("events").EventEmitter;
var parse = require("irc-message").parse;
var util = require("util");
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
function client(opts) {
    var self = this;

    self.opts = (typeof options !== "undefined") ? options : {};
    self.opts.channels = opts.channels || [];
    self.opts.connection = opts.connection || {};
    self.opts.identity = opts.identity || {};
    self.opts.options = opts.options || {};

    self.username = "";
    self.userstate = {};
    self.ws = null;

    // Create the logger..
    self.log = bunyan.createLogger({
        name: "twitch-tmi",
        streams: [
            {
                level: "error",
                stream: new rawStream(),
                type: "raw"
            }
        ]
    });

    // Show debug messages ?
    if (typeof self.opts.options.debug !== "undefined" ? self.opts.options.debug : false) { self.log.level("info"); }

    eventEmitter.call(self);
}

util.inherits(client, eventEmitter);

// Handle parsed message..
client.prototype.handleMessage = function handleMessage(message) {
    var self = this;

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
                self.log.warn("Could not parse message with no prefix: ");
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

                loopIterate(self.opts.channels, function (element) {
                    self.ws.send("JOIN " + element);
                }, 1000);
                break;

            // https://github.com/justintv/Twitch-API/blob/master/chat/capabilities.md#notice
            case "NOTICE":
                var msgid = message.tags["msg-id"] || null;

                switch(msgid) {
                    // This room is now in subscribers-only mode.
                    case "subs_on":
                        self.log.info("[" + message.params[0] + "] This room is now in subscribers-only mode.");
                        self.emit("subscribers", message.params[0], true);
                        break;

                    // This room is no longer in subscribers-only mode.
                    case "subs_off":
                        self.log.info("[" + message.params[0] + "] This room is no longer in subscribers-only mode.");
                        self.emit("subscribers", message.params[0], false);
                        break;

                    // This room is now in slow mode. You may send messages every slow_duration seconds.
                    case "slow_on":
                        // TODO: Display seconds..
                        self.log.info("[" + message.params[0] + "] This room is now in slow mode.");
                        self.emit("slow", message.params[0], true);
                        break;

                    // This room is no longer in slow mode.
                    case "slow_off":
                        self.log.info("[" + message.params[0] + "] This room is no longer in slow mode.");
                        self.emit("slow", message.params[0], false);
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
                        break;

                    // Now hosting target_channel.
                    case "host_on":
                        // TODO: Display channel being hosted and do not trigger if HOSTTARGET has been triggered..
                        self.log.info("[" + message.params[0] + "] Now hosting another channel.");
                        self.emit("hosting", message.params[0]);
                        break;

                    // Exited host mode.
                    case "host_off":
                        self.log.info("[" + message.params[0] + "] Exited host mode.");
                        self.emit("unhost", message.params[0]);
                        break;
                }
                break;

            case "HOSTTARGET":
                self.log.info("[" + message.params[0] + "] Now hosting " + message.params[1].split(" ")[0] + ".");
                self.emit("hosting", message.params[0], message.params[1].split(" ")[0]);
                break;

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
                self.log.info(message);
                break;

            case "USERSTATE":
                message.tags.username = self.username;
                self.userstate[message.params[0]] = message.tags;
                break;

            default:
                self.log.warn("Could not parse message from tmi.twitch.tv: ");
                self.log.warn(message);
                break;
        }
    }

    // Messages from jtv..
    else if (message.prefix === "jtv") {
        switch(message.command) {
            case "MODE":
                break;

            default:
                self.log.warn("Could not parse message from jtv: ");
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
                    self.log.info("[" + message.params[0] + "] *<" + message.tags.username + ">: " + message.params[1].substr(message.params[1].indexOf(" ") + 1));
                    self.emit("action", message.params[0], message.tags, message.params[1].substr(message.params[1].indexOf(" ") + 1));
                }
                // Message is a regular message..
                else {
                    self.log.info("[" + message.params[0] + "] <" + message.tags.username + ">: " + message.params[1]);
                    self.emit("chat", message.params[0], message.tags, message.params[1]);
                }
                break;

            default:
                self.log.warn("Could not parse message: ");
                self.log.warn(message);
                break;
        }
    }
};

// Connect to server..
client.prototype.connect = function connect() {
    var self = this;

    // TODO: Get a random ws/wss server from Twitch if undefined
    self.server = typeof self.opts.connection.server !== "undefined" ? self.opts.connection.server : "192.16.64.145";
    self.port = typeof self.opts.connection.port !== "undefined" ? self.opts.connection.port : 443;

    self.ws = new webSocket("ws://" + self.server + ":" + self.port + "/", "irc");

    self.ws.onmessage = self._onMessage.bind(this);
    self.ws.onerror = self._onError.bind(this);
    self.ws.onclose = self._onClose.bind(this);
    self.ws.onopen = self._onOpen.bind(this);
};

// Socket is opened..
client.prototype._onOpen = function _onOpen(event) {
    var self = this;

    // Emitting "connecting" event..
    self.log.info("Connecting to %s on port %s..", self.server, self.port);
    self.emit("connecting", self.server, self.port);

    self.username = typeof self.opts.identity.username !== "undefined" ? self.opts.identity.username : "justinfan" + Math.floor((Math.random() * 80000) + 1000);
    self.password = typeof self.opts.identity.password !== "undefined" ? self.opts.identity.password : "SCHMOOPIIE";

    // Make sure "oauth:" is included..
    if (self.password !== "SCHMOOPIIE" && self.password.indexOf("oauth:") < 0) {
        self.password = "oauth:" + self.password;
    }

    // Emitting "logon" event..
    self.log.info("Sending authentication to server..");
    self.emit("logon");

    // Authentication..
    self.ws.send("PASS " + self.password);
    self.ws.send("NICK " + self.username);
    self.ws.send("USER " + self.username + " 8 * :" + self.username);
};

// Received message from server..
client.prototype._onMessage = function _onMessage(event) {
    var self = this;
    self.handleMessage(parse(event.data.replace("\r\n", "")));
};

// An error occurred..
client.prototype._onError = function _onError(event) {
    var self = this;
    self.log.error(event);
};

// Socket connection closed..
client.prototype._onClose = function _onClose(event) {
    var self = this;
    self.log.info(event.reason);
};

// Disconnect from server..
client.prototype.disconnect = function disconnect() {
    if (self.ws !== null && self.ws.readyState !== 3) {
        self.ws.close();
    }
};

// Loop through array..
function loopIterate(array, callback, interval) {
    var start = + new Date();
    if (array.length > 0) { process(); }

    function process() {
        var element = array.shift();
        callback(element, new Date() - start);

        if (array.length > 0) { setTimeout(process, interval); }
    }
}

// Expose everything, for browser and Node.js / io.js
if (typeof window !== "undefined") {
    window.client = client;
} else {
    module.exports = client;
}
