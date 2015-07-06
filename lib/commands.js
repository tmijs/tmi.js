var _ = require("underscore");
var contains = require("underscore.string/include");
var startsWith = require("underscore.string/startsWith");
var utils = require("./utils");

module.exports = {
    action: function action(channel, message) {
        message = "\u0001ACTION " + message + "\u0001";
        return this._sendMessage(channel, message);
    },
    ban: function ban(channel, username) {
        return this._sendCommand(channel, "/ban " + utils.normalizeUsername(username));
    },
    clear: function clear(channel) {
        return this._sendCommand(channel, "/clear");
    },
    color: function color(channel, color) {
        return this._sendCommand(channel, "/color " + color);
    },
    commercial: function commercial(channel, seconds) {
        seconds = typeof seconds === "undefined" ? 30 : seconds;
        return this._sendCommand(channel, "/commercial " + seconds);
    },
    host: function host(channel, target) {
        return this._sendCommand(channel, "/host " + utils.normalizeUsername(target));
    },
    join: function join(channel) {
        return this._sendCommand(null, "JOIN " + utils.normalizeChannel(channel));
    },
    mod: function mod(channel, username) {
        return this._sendCommand(channel, "/mod " + utils.normalizeUsername(username));
    },
    mods: function mods(channel) {
        return this._sendCommand(channel, "/mods");
    },
    part: function part(channel) {
        return this._sendCommand(null, "PART " + utils.normalizeChannel(channel));
    },
    leave: function leave(channel) {
        return this._sendCommand(null, "PART " + utils.normalizeChannel(channel));
    },
    ping: function ping() {
        return this._sendCommand(null, "PING");
    },
    r9kbeta: function r9kbeta(channel) {
        return this._sendCommand(channel, "/r9kbeta");
    },
    r9kmode: function r9kmode(channel) {
        return this._sendCommand(channel, "/r9kbeta");
    },
    r9kbetaoff: function r9kbetaoff(channel) {
        return this._sendCommand(channel, "/r9kbetaoff");
    },
    r9kmodeoff: function r9kmodeoff(channel) {
        return this._sendCommand(channel, "/r9kbetaoff");
    },
    raw: function raw(message) {
        return this._sendCommand(null, message);
    },
    say: function say(channel, message) {
        if (startsWith(message.toLowerCase(), "/me ") || startsWith(message.toLowerCase(), "\\me ")) {
            return this.action(channel, message.substr(4));
        }
        else if (startsWith(message, ".") || startsWith(message, "/") || startsWith(message, "\\")) {
            return this._sendCommand(channel, message);
        }
        return this._sendMessage(channel, message);
    },
    slow: function slow(channel, seconds) {
        seconds = typeof seconds === "undefined" ? 300 : seconds;

        return this._sendCommand(channel, "/seconds " + seconds);
    },
    slowmode: function slowmode(channel, seconds) {
        seconds = typeof seconds === "undefined" ? 300 : seconds;

        return this._sendCommand(channel, "/seconds " + seconds);
    },
    slowoff: function slowoff(channel) {
        return this._sendCommand(channel, "/slowoff");
    },
    slowmodeoff: function slowoff(channel) {
        return this._sendCommand(channel, "/slowoff");
    },
    subscribers: function subscribers(channel) {
        return this._sendCommand(channel, "/subscribers");
    },
    subscribersoff: function subscribersoff(channel) {
        return this._sendCommand(channel, "/subscribersoff");
    },
    timeout: function timeout(channel, username, seconds) {
        seconds = typeof seconds === "undefined" ? 300 : seconds;
        username = typeof username === "undefined" ? "Kappa" : username;

        return this._sendCommand(channel, "/timeout " + username + " " + seconds);
    },
    unban: function unban(channel, username) {
        return this._sendCommand(channel, "/unban " + utils.normalizeUsername(username));
    },
    unhost: function unhost(channel) {
        return this._sendCommand(channel, "/unhost");
    },
    unmod: function unmod(channel, username) {
        return this._sendCommand(channel, "/unmod " + utils.normalizeUsername(username));
    },
    whisper: function whisper(username, message) {
        return this._sendCommand("#jtv", "/w " + utils.normalizeUsername(username) + " " + message);
    }
}
