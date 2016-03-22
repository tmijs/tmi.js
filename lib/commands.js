var _ = require("underscore");
var utils = require("./utils");

module.exports = {
    action: function action(channel, message) {
        channel = utils.normalizeChannel(channel);
        message = `\u0001ACTION ${message}\u0001`;

        return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, reject) => {
            resolve([channel, message]);
        });
    },
    ban: function ban(channel, username) {
        channel = utils.normalizeChannel(channel);
        username = utils.normalizeUsername(username);

        return this._sendCommand(this._getPromiseDelay(), channel, `/ban ${username}`, (resolve, reject) => {
            this.once("_promiseBan", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },
    clear: function clear(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/clear", (resolve, reject) => {
            this.once("_promiseClear", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    color: function color(channel, newColor) {
        if (typeof newColor === "undefined") { newColor = channel; }

        return this._sendCommand(this._getPromiseDelay(), "#jtv", `/color ${newColor}`, (resolve, reject) => {
            this.once("_promiseColor", (err) => {
                if (!err) { resolve([newColor]); }
                else { reject(err); }
            });
        });
    },
    commercial: function commercial(channel, seconds) {
        channel = utils.normalizeChannel(channel);
        seconds = typeof seconds === "undefined" ? 30 : seconds;

        return this._sendCommand(this._getPromiseDelay(), channel, `/commercial ${seconds}`, (resolve, reject) => {
            this.once("_promiseCommercial", (err) => {
                if (!err) { resolve([channel, seconds]); }
                else { reject(err); }
            });
        });
    },
    emoteonly: function emoteonly(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/emoteonly", (resolve, reject) => {
            this.once("_promiseEmoteonly", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    emoteonlyoff: function emoteonlyoff(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/emoteonlyoff", (resolve, reject) => {
            this.once("_promiseEmoteonlyoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    host: function host(channel, target) {
        channel = utils.normalizeChannel(channel);
        target = utils.normalizeUsername(target);

        return this._sendCommand(2000, channel, `/host ${target}`, (resolve, reject) => {
            this.once("_promiseHost", (err, remaining) => {
                if (!err) { resolve([channel, target, remaining]); }
                else { reject(err); }
            });
        });
    },
    join: function join(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), null, `JOIN ${channel}`, (resolve, reject) => {
            this.once("_promiseJoin", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    mod: function mod(channel, username) {
        channel = utils.normalizeChannel(channel);
        username = utils.normalizeUsername(username);

        return this._sendCommand(this._getPromiseDelay(), channel, `/mod ${username}`, (resolve, reject) => {
            this.once("_promiseMod", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },
    mods: function mods(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/mods", (resolve, reject) => {
            this.once("_promiseMods", (err, mods) => {
                if (!err) {
                    mods.forEach((username) => {
                        if (!this.moderators[channel]) { this.moderators[channel] = []; }
                        if (this.moderators[channel].indexOf(username) < 0) { this.moderators[channel].push(username); }
                    });
                    resolve(mods);
                } else { reject(err); }
            });
        });
    },
    part: function part(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), null, `PART ${channel}`, (resolve, reject) => {
            this.once("_promisePart", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    leave: function leave(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), null, `PART ${channel}`, (resolve, reject) => {
            this.once("_promisePart", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    ping: function ping() {
        return this._sendCommand(this._getPromiseDelay(), null, "PING", (resolve, reject) => {
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

            this.once("_promisePing", (latency) => { resolve([latency]); });
        });
    },
    r9kbeta: function r9kbeta(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/r9kbeta", (resolve, reject) => {
            this.once("_promiseR9kbeta", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    r9kmode: function r9kmode(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/r9kbeta", (resolve, reject) => {
            this.once("_promiseR9kbeta", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    r9kbetaoff: function r9kbetaoff(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/r9kbetaoff", (resolve, reject) => {
            this.once("_promiseR9kbetaoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    r9kmodeoff: function r9kmodeoff(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/r9kbetaoff", (resolve, reject) => {
            this.once("_promiseR9kbetaoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    raw: function raw(message) {
        return this._sendCommand(this._getPromiseDelay(), null, message, (resolve, reject) => {
            resolve([message]);
        });
    },
    say: function say(channel, message) {
        channel = utils.normalizeChannel(channel);

        if (message.toLowerCase().startsWith("/me ") || message.toLowerCase().startsWith("\\me ")) {
            return this.action(channel, message.substr(4));
        }
        else if (message.startsWith(".") || message.startsWith("/") || message.startsWith("\\")) {
            return this._sendCommand(this._getPromiseDelay(), channel, message, (resolve, reject) => {
                resolve([channel]);
            });
        }
        return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, reject) => {
            resolve([channel, message]);
        });
    },
    slow: function slow(channel, seconds) {
        channel = utils.normalizeChannel(channel);
        seconds = typeof seconds === "undefined" ? 300 : seconds;

        return this._sendCommand(this._getPromiseDelay(), channel, `/slow ${seconds}`, (resolve, reject) => {
            this.once("_promiseSlow", (err) => {
                if (!err) { resolve([channel, seconds]); }
                else { reject(err); }
            });
        });
    },
    slowmode: function slowmode(channel, seconds) {
        channel = utils.normalizeChannel(channel);
        seconds = typeof seconds === "undefined" ? 300 : seconds;

        return this._sendCommand(this._getPromiseDelay(), channel, `/slow ${seconds}`, (resolve, reject) => {
            this.once("_promiseSlow", (err) => {
                if (!err) { resolve([channel, seconds]); }
                else { reject(err); }
            });
        });
    },
    slowoff: function slowoff(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/slowoff", (resolve, reject) => {
            this.once("_promiseSlowoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    slowmodeoff: function slowoff(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/slowoff", (resolve, reject) => {
            this.once("_promiseSlowoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    subscribers: function subscribers(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/subscribers", (resolve, reject) => {
            this.once("_promiseSubscribers", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    subscribersoff: function subscribersoff(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(this._getPromiseDelay(), channel, "/subscribersoff", (resolve, reject) => {
            this.once("_promiseSubscribersoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    timeout: function timeout(channel, username, seconds) {
        channel = utils.normalizeChannel(channel);
        username = utils.normalizeUsername(username);
        seconds = typeof seconds === "undefined" ? 300 : seconds;

        return this._sendCommand(this._getPromiseDelay(), channel, `/timeout ${username} ${seconds}`, (resolve, reject) => {
            this.once("_promiseTimeout", (err) => {
                if (!err) { resolve([channel, username, seconds]); }
                else { reject(err); }
            });
        });
    },
    unban: function unban(channel, username) {
        channel = utils.normalizeChannel(channel);
        username = utils.normalizeUsername(username);

        return this._sendCommand(this._getPromiseDelay(), channel, `/unban ${username}`, (resolve, reject) => {
            this.once("_promiseUnban", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },
    unhost: function unhost(channel) {
        channel = utils.normalizeChannel(channel);

        return this._sendCommand(2000, channel, "/unhost", (resolve, reject) => {
            this.once("_promiseUnhost", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },
    unmod: function unmod(channel, username) {
        channel = utils.normalizeChannel(channel);
        username = utils.normalizeUsername(username);

        return this._sendCommand(this._getPromiseDelay(), channel, `/unmod ${username}`, (resolve, reject) => {
            this.once("_promiseUnmod", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },
    whisper: function whisper(username, message) {
        username = utils.normalizeUsername(username);

        return this._sendCommand(this._getPromiseDelay(), "#jtv", `/w ${username} ${message}`, (resolve, reject) => {
            resolve([username, message]);
        });
    }
}
