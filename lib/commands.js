var _ = require("./utils");

// Enable followers-only mode on a channel..
function followersonly(channel, minutes) {
    channel = _.channel(channel);
    minutes = _.get(minutes, 30);

    // Send the command to the server and race the Promise against a delay..
    return this._sendCommand(this._getPromiseDelay(), channel, `/followers ${minutes}`, (resolve, reject) => {
        // Received _promiseFollowers event, resolve or reject..
        this.once("_promiseFollowers", (err) => {
            if (!err) { resolve([channel, ~~minutes]); }
            else { reject(err); }
        });
    });
}

// Disable followers-only mode on a channel..
function followersonlyoff(channel) {
    channel = _.channel(channel);

    // Send the command to the server and race the Promise against a delay..
    return this._sendCommand(this._getPromiseDelay(), channel, "/followersoff", (resolve, reject) => {
        // Received _promiseFollowersoff event, resolve or reject..
        this.once("_promiseFollowersoff", (err) => {
            if (!err) { resolve([channel]); }
            else { reject(err); }
        });
    });
}

// Leave a channel..
function part(channel) {
    channel = _.channel(channel);

    // Send the command to the server and race the Promise against a delay..
    return this._sendCommand(this._getPromiseDelay(), null, `PART ${channel}`, (resolve, reject) => {
        // Received _promisePart event, resolve or reject..
        this.once("_promisePart", (err) => {
            if (!err) { resolve([channel]); }
            else { reject(err); }
        });
    });
}

// Enable R9KBeta mode on a channel..
function r9kbeta(channel) {
    channel = _.channel(channel);

    // Send the command to the server and race the Promise against a delay..
    return this._sendCommand(this._getPromiseDelay(), channel, "/r9kbeta", (resolve, reject) => {
        // Received _promiseR9kbeta event, resolve or reject..
        this.once("_promiseR9kbeta", (err) => {
            if (!err) { resolve([channel]); }
            else { reject(err); }
        });
    });
}

// Disable R9KBeta mode on a channel..
function r9kbetaoff(channel) {
    channel = _.channel(channel);

    // Send the command to the server and race the Promise against a delay..
    return this._sendCommand(this._getPromiseDelay(), channel, "/r9kbetaoff", (resolve, reject) => {
        // Received _promiseR9kbetaoff event, resolve or reject..
        this.once("_promiseR9kbetaoff", (err) => {
            if (!err) { resolve([channel]); }
            else { reject(err); }
        });
    });
}

// Enable slow mode on a channel..
function slow(channel, seconds) {
    channel = _.channel(channel);
    seconds = _.get(seconds, 300);

    // Send the command to the server and race the Promise against a delay..
    return this._sendCommand(this._getPromiseDelay(), channel, `/slow ${seconds}`, (resolve, reject) => {
        // Received _promiseSlow event, resolve or reject..
        this.once("_promiseSlow", (err) => {
            if (!err) { resolve([channel, ~~seconds]); }
            else { reject(err); }
        });
    });
}

// Disable slow mode on a channel..
function slowoff(channel) {
    channel = _.channel(channel);

    // Send the command to the server and race the Promise against a delay..
    return this._sendCommand(this._getPromiseDelay(), channel, "/slowoff", (resolve, reject) => {
        // Received _promiseSlowoff event, resolve or reject..
        this.once("_promiseSlowoff", (err) => {
            if (!err) { resolve([channel]); }
            else { reject(err); }
        });
    });
}

module.exports = {
    // Send action message (/me <message>) on a channel..
    action: function action(channel, message) {
        channel = _.channel(channel);
        message = `\u0001ACTION ${message}\u0001`;

        // Send the command to the server and race the Promise against a delay..
        return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, reject) => {
            // At this time, there is no possible way to detect if a message has been sent has been eaten
            // by the server, so we can only resolve the Promise.
            resolve([channel, message]);
        });
    },

    // Ban username on channel..
    ban: function ban(channel, username, reason) {
        channel = _.channel(channel);
        username = _.username(username);
        reason = _.get(reason, "");

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/ban ${username} ${reason}`, (resolve, reject) => {
            // Received _promiseBan event, resolve or reject..
            this.once("_promiseBan", (err) => {
                if (!err) { resolve([channel, username, reason]); }
                else { reject(err); }
            });
        });
    },

    // Clear all messages on a channel..
    clear: function clear(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, "/clear", (resolve, reject) => {
            // Received _promiseClear event, resolve or reject..
            this.once("_promiseClear", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },

    // Change the color of your username..
    color: function color(channel, newColor) {
        newColor = _.get(newColor, channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), "#tmijs", `/color ${newColor}`, (resolve, reject) => {
            // Received _promiseColor event, resolve or reject..
            this.once("_promiseColor", (err) => {
                if (!err) { resolve([newColor]); }
                else { reject(err); }
            });
        });
    },

    // Run commercial on a channel for X seconds..
    commercial: function commercial(channel, seconds) {
        channel = _.channel(channel);
        seconds = _.get(seconds, 30);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/commercial ${seconds}`, (resolve, reject) => {
            // Received _promiseCommercial event, resolve or reject..
            this.once("_promiseCommercial", (err) => {
                if (!err) { resolve([channel, ~~seconds]); }
                else { reject(err); }
            });
        });
    },
	
	
    // Delete a specific message on a channel
    deletemessage: function deletemessage(channel, messageUUID) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/delete ${messageUUID}`, (resolve, reject) => {
            // Received _promiseDeletemessage event, resolve or reject..
            this.once("_promiseDeletemessage", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },

    // Enable emote-only mode on a channel..
    emoteonly: function emoteonly(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, "/emoteonly", (resolve, reject) => {
            // Received _promiseEmoteonly event, resolve or reject..
            this.once("_promiseEmoteonly", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },

    // Disable emote-only mode on a channel..
    emoteonlyoff: function emoteonlyoff(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, "/emoteonlyoff", (resolve, reject) => {
            // Received _promiseEmoteonlyoff event, resolve or reject..
            this.once("_promiseEmoteonlyoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },

    // Enable followers-only mode on a channel..
    followersonly: followersonly,

    // Alias for followersonly()..
    followersmode: followersonly,

    // Disable followers-only mode on a channel..
    followersonlyoff: followersonlyoff,

    // Alias for followersonlyoff()..
    followersmodeoff: followersonlyoff,

    // Host a channel..
    host: function host(channel, target) {
        channel = _.channel(channel);
        target = _.username(target);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(2000, channel, `/host ${target}`, (resolve, reject) => {
            // Received _promiseHost event, resolve or reject..
            this.once("_promiseHost", (err, remaining) => {
                if (!err) { resolve([channel, target, ~~remaining]); }
                else { reject(err); }
            });
        });
    },

    // Join a channel..
    join: function join(channel) {
        channel = _.channel(channel);

        // Send the command to the server ..
        return this._sendCommand(null, null, `JOIN ${channel}`, (resolve, reject) => {
            var eventName = "_promiseJoin";
            var hasFulfilled = false;
            var listener = (err, joinedChannel) => {
                if (channel === _.channel(joinedChannel)) {
                    // Received _promiseJoin event for the target channel, resolve or reject..
                    this.removeListener(eventName, listener);
                    hasFulfilled = true;
                    if (!err) { resolve([channel]); }
                    else { reject(err); }
                }
            };
            this.on(eventName, listener);
            // Race the Promise against a delay..
            var delay = this._getPromiseDelay();
            _.promiseDelay(delay).then(() => {
                if (!hasFulfilled) {
                    this.emit(eventName, "No response from Twitch.", channel);
                }
            });
        });
    },

    // Mod username on channel..
    mod: function mod(channel, username) {
        channel = _.channel(channel);
        username = _.username(username);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/mod ${username}`, (resolve, reject) => {
            // Received _promiseMod event, resolve or reject..
            this.once("_promiseMod", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },

    // Get list of mods on a channel..
    mods: function mods(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, "/mods", (resolve, reject) => {
            // Received _promiseMods event, resolve or reject..
            this.once("_promiseMods", (err, mods) => {
                if (!err) {
                    // Update the internal list of moderators..
                    mods.forEach((username) => {
                        if (!this.moderators[channel]) { this.moderators[channel] = []; }
                        if (!this.moderators[channel].includes(username)) { this.moderators[channel].push(username); }
                    });
                    resolve(mods);
                } else { reject(err); }
            });
        });
    },

    // Leave a channel..
    part: part,

    // Alias for part()..
    leave: part,

    // Send a ping to the server..
    ping: function ping() {
        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), null, "PING", (resolve, reject) => {
            // Update the internal ping timeout check interval..
            this.latency = new Date();
            this.pingTimeout = setTimeout(() => {
                if (this.ws !== null) {
                    this.wasCloseCalled = false;
                    this.log.error("Ping timeout.");
                    this.ws.close();

                    clearInterval(this.pingLoop);
                    clearTimeout(this.pingTimeout);
                }
            }, _.get(this.opts.connection.timeout, 9999));

            // Received _promisePing event, resolve or reject..
            this.once("_promisePing", (latency) => { resolve([parseFloat(latency)]); });
        });
    },

    // Enable R9KBeta mode on a channel..
    r9kbeta: r9kbeta,

    // Alias for r9kbeta()..
    r9kmode: r9kbeta,

    // Disable R9KBeta mode on a channel..
    r9kbetaoff: r9kbetaoff,

    // Alias for r9kbetaoff()..
    r9kmodeoff: r9kbetaoff,

    // Send a raw message to the server..
    raw: function raw(message) {
        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), null, message, (resolve, reject) => {
            resolve([message]);
        });
    },

    // Send a message on a channel..
    say: function say(channel, message) {
        channel = _.channel(channel);

        if ((message.startsWith(".") && !message.startsWith("..")) || message.startsWith("/") || message.startsWith("\\")) {
            // Check if the message is an action message..
            if (message.substr(1, 3) === "me ") {
                return this.action(channel, message.substr(4));
            }
            else {
                // Send the command to the server and race the Promise against a delay..
                return this._sendCommand(this._getPromiseDelay(), channel, message, (resolve, reject) => {
                    // At this time, there is no possible way to detect if a message has been sent has been eaten
                    // by the server, so we can only resolve the Promise.
                    resolve([channel, message]);
                });
            }
        }

        // Send the command to the server and race the Promise against a delay..
        return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, reject) => {
            // At this time, there is no possible way to detect if a message has been sent has been eaten
            // by the server, so we can only resolve the Promise.
            resolve([channel, message]);
        });
    },

    // Enable slow mode on a channel..
    slow: slow,

    // Alias for slow()..
    slowmode: slow,

    // Disable slow mode on a channel..
    slowoff: slowoff,

    // Alias for slowoff()..
    slowmodeoff: slowoff,

    // Enable subscribers mode on a channel..
    subscribers: function subscribers(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, "/subscribers", (resolve, reject) => {
            // Received _promiseSubscribers event, resolve or reject..
            this.once("_promiseSubscribers", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },

    // Disable subscribers mode on a channel..
    subscribersoff: function subscribersoff(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, "/subscribersoff", (resolve, reject) => {
            // Received _promiseSubscribersoff event, resolve or reject..
            this.once("_promiseSubscribersoff", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },

    // Timeout username on channel for X seconds..
    timeout: function timeout(channel, username, seconds, reason) {
        channel = _.channel(channel);
        username = _.username(username);

        if (!_.isNull(seconds) && !_.isInteger(seconds)) {
            reason = seconds;
            seconds = 300;
        }

        seconds = _.get(seconds, 300);
        reason = _.get(reason, "");

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/timeout ${username} ${seconds} ${reason}`, (resolve, reject) => {
            // Received _promiseTimeout event, resolve or reject..
            this.once("_promiseTimeout", (err) => {
                if (!err) { resolve([channel, username, ~~seconds, reason]); }
                else { reject(err); }
            });
        });
    },

    // Unban username on channel..
    unban: function unban(channel, username) {
        channel = _.channel(channel);
        username = _.username(username);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/unban ${username}`, (resolve, reject) => {
            // Received _promiseUnban event, resolve or reject..
            this.once("_promiseUnban", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },

    // End the current hosting..
    unhost: function unhost(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(2000, channel, "/unhost", (resolve, reject) => {
            // Received _promiseUnhost event, resolve or reject..
            this.once("_promiseUnhost", (err) => {
                if (!err) { resolve([channel]); }
                else { reject(err); }
            });
        });
    },

    // Unmod username on channel..
    unmod: function unmod(channel, username) {
        channel = _.channel(channel);
        username = _.username(username);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/unmod ${username}`, (resolve, reject) => {
            // Received _promiseUnmod event, resolve or reject..
            this.once("_promiseUnmod", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },

    // Unvip username on channel..
    unvip: function unvip(channel, username) {
        channel = _.channel(channel);
        username = _.username(username);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/unvip ${username}`, (resolve, reject) => {
            // Received _promiseUnvip event, resolve or reject..
            this.once("_promiseUnvip", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },

    // Add username to VIP list on channel..
    vip: function vip(channel, username) {
        channel = _.channel(channel);
        username = _.username(username);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, `/vip ${username}`, (resolve, reject) => {
            // Received _promiseVip event, resolve or reject..
            this.once("_promiseVip", (err) => {
                if (!err) { resolve([channel, username]); }
                else { reject(err); }
            });
        });
    },

    // Get list of VIPs on a channel..
    vips: function vips(channel) {
        channel = _.channel(channel);

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), channel, "/vips", (resolve, reject) => {
            // Received _promiseVips event, resolve or reject..
            this.once("_promiseVips", (err, vips) => {
                if (!err) { resolve(vips); }
                else { reject(err); }
            });
        });
    },

    // Send an whisper message to a user..
    whisper: function whisper(username, message) {
        username = _.username(username);

        // The server will not send a whisper to the account that sent it.
        if (username === this.getUsername()) {
            return Promise.reject("Cannot send a whisper to the same account.");
        }

        // Send the command to the server and race the Promise against a delay..
        return this._sendCommand(this._getPromiseDelay(), "#tmijs", `/w ${username} ${message}`, (resolve, reject) => {
            var from = _.channel(username),
                userstate = _.merge({
                        "message-type": "whisper",
                        "message-id": null,
                        "thread-id": null,
                        username: this.getUsername()
                    }, this.globaluserstate);

            // Emit for both, whisper and message..
            this.emits(["whisper", "message"], [
                [from, userstate, message, true],
                [from, userstate, message, true]
            ]);

            // At this time, there is no possible way to detect if a message has been sent has been eaten
            // by the server, so we can only resolve the Promise.
            resolve([username, message]);
        });
    }
}
