const _ = require('./utils');

// Enable followers-only mode on a channel
function followersonly(channel, minutes) {
	channel = _.channel(channel);
	minutes = minutes ?? 30;
	return this._sendCommand({ channel, command: `/followers ${minutes}` }, (res, rej) =>
		this.once('_promiseFollowers', err => !err ? res([ channel, ~~minutes ]) : rej(err))
	);
}

// Disable followers-only mode on a channel
function followersonlyoff(channel) {
	channel = _.channel(channel);
	return this._sendCommand({ channel, command: '/followersoff' }, (res, rej) =>
		this.once('_promiseFollowersoff', err => !err ? res([ channel ]) : rej(err))
	);
}

// Leave a channel
function part(channel) {
	channel = _.channel(channel);
	return this._sendCommand({ delay: null, channel: null, command: `PART ${channel}` }, (res, rej) =>
		this.once('_promisePart', err => !err ? res([ channel ]) : rej(err))
	);
}

// Enable R9KBeta mode on a channel
function r9kbeta(channel) {
	channel = _.channel(channel);
	return this._sendCommand({ channel, command: '/r9kbeta' }, (res, rej) =>
		this.once('_promiseR9kbeta', err => !err ? res([ channel ]) : rej(err))
	);
}

// Disable R9KBeta mode on a channel
function r9kbetaoff(channel) {
	channel = _.channel(channel);
	return this._sendCommand({ channel, command: '/r9kbetaoff' }, (res, rej) =>
		this.once('_promiseR9kbetaoff', err => !err ? res([ channel ]) : rej(err))
	);
}

// Enable slow mode on a channel
function slow(channel, seconds) {
	channel = _.channel(channel);
	seconds = seconds ?? 300;
	return this._sendCommand({ channel, command: `/slow ${seconds}` }, (res, rej) =>
		this.once('_promiseSlow', err => !err ? res([ channel, ~~seconds ]) : rej(err))
	);
}

// Disable slow mode on a channel
function slowoff(channel) {
	channel = _.channel(channel);
	return this._sendCommand({ channel, command: '/slowoff' }, (res, rej) =>
		this.once('_promiseSlowoff', err => !err ? res([ channel ]) : rej(err))
	);
}

module.exports = {
	// Send action message (/me <message>) on a channel
	action(channel, message, tags) {
		channel = _.channel(channel);
		message = `\u0001ACTION ${message}\u0001`;
		return this._sendMessage({ delay: this._getPromiseDelay(), channel, message, tags }, (res, _rej) =>
			// At this time, there is no possible way to detect if a message has been sent has been eaten
			// by the server, so we can only resolve the Promise.
			res([ channel, message ])
		);
	},

	// Ban username on channel
	ban(channel, username, reason) {
		channel = _.channel(channel);
		username = _.username(username);
		reason = reason ?? '';
		return this._sendCommand({ channel, command: `/ban ${username} ${reason}` }, (res, rej) =>
			this.once('_promiseBan', err => !err ? res([ channel, username, reason ]) : rej(err))
		);
	},

	// Clear all messages on a channel
	clear(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: '/clear' }, (res, rej) =>
			this.once('_promiseClear', err => !err ? res([ channel ]) : rej(err))
		);
	},

	// Change the color of your username
	color(channel, newColor) {
		newColor = newColor ?? channel;
		return this._sendCommand({ channel: this._globalDefaultChannel, command: `/color ${newColor}` }, (res, rej) =>
			this.once('_promiseColor', err => !err ? res([ newColor ]) : rej(err))
		);
	},

	// Run commercial on a channel for X seconds
	commercial(channel, seconds) {
		channel = _.channel(channel);
		seconds = seconds ?? 30;
		return this._sendCommand({ channel, command: `/commercial ${seconds}` }, (res, rej) =>
			this.once('_promiseCommercial', err => !err ? res([ channel, ~~seconds ]) : rej(err))
		);
	},

	// Delete a specific message on a channel
	deletemessage(channel, messageUUID) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: `/delete ${messageUUID}` }, (res, rej) =>
			this.once('_promiseDeletemessage', err => !err ? res([ channel ]) : rej(err))
		);
	},

	// Enable emote-only mode on a channel
	emoteonly(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: '/emoteonly' }, (res, rej) =>
			this.once('_promiseEmoteonly', err => !err ? res([ channel ]) : rej(err))
		);
	},

	// Disable emote-only mode on a channel
	emoteonlyoff(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: '/emoteonlyoff' }, (res, rej) =>
			this.once('_promiseEmoteonlyoff', err => !err ? res([ channel ]) : rej(err))
		);
	},

	// Enable followers-only mode on a channel
	followersonly,

	// Alias for followersonly()
	followersmode: followersonly,

	// Disable followers-only mode on a channel
	followersonlyoff,

	// Alias for followersonlyoff()
	followersmodeoff: followersonlyoff,

	// Host a channel
	host(channel, target) {
		channel = _.channel(channel);
		target = _.username(target);
		return this._sendCommand({ delay: 2000, channel, command: `/host ${target}` }, (res, rej) =>
			this.once('_promiseHost', (err, remaining) => !err ? res([ channel, target, ~~remaining ]) : rej(err))
		);
	},

	// Join a channel
	join(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ delay: undefined, channel: null, command: `JOIN ${channel}` }, (res, rej) => {
			const eventName = '_promiseJoin';
			let hasFulfilled = false;
			const listener = (err, joinedChannel) => {
				if(channel === _.channel(joinedChannel)) {
					// Received _promiseJoin event for the target channel
					this.removeListener(eventName, listener);
					hasFulfilled = true;
					!err ? res([ channel ]) : rej(err);
				}
			};
			this.on(eventName, listener);
			// Race the Promise against a delay
			const delay = this._getPromiseDelay();
			_.promiseDelay(delay).then(() => {
				if(!hasFulfilled) {
					this.emit(eventName, 'No response from Twitch.', channel);
				}
			});
		});
	},

	// Mod username on channel
	mod(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		return this._sendCommand({ channel, command: `/mod ${username}` }, (res, rej) =>
			this.once('_promiseMod', err => !err ? res([ channel, username ]) : rej(err))
		);
	},

	// Get list of mods on a channel
	mods(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: '/mods' }, (resolve, reject) => {
			this.once('_promiseMods', (err, mods) => {
				if(!err) {
					// Update the internal list of moderators
					mods.forEach(username => {
						if(!this.moderators[channel]) {
							this.moderators[channel] = [];
						}
						if(!this.moderators[channel].includes(username)) {
							this.moderators[channel].push(username);
						}
					});
					resolve(mods);
				}
				else {
					reject(err);
				}
			});
		});
	},

	// Leave a channel
	part,

	// Alias for part()
	leave: part,

	// Send a ping to the server
	ping() {
		return this._sendCommand({ delay: null, command: 'PING' }, (res, _rej) => {
			// Update the internal ping timeout check interval
			this.latency = new Date();
			this.pingTimeout = setTimeout(() => {
				if(this.ws !== null) {
					this.wasCloseCalled = false;
					this.log.error('Ping timeout.');
					this.ws.close();

					clearInterval(this.pingLoop);
					clearTimeout(this.pingTimeout);
				}
			}, this.opts.connection.timeout ?? 9999);
			this.once('_promisePing', latency => res([ parseFloat(latency) ]));
		});
	},

	// Enable R9KBeta mode on a channel
	r9kbeta,

	// Alias for r9kbeta()
	r9kmode: r9kbeta,

	// Disable R9KBeta mode on a channel
	r9kbetaoff,

	// Alias for r9kbetaoff()
	r9kmodeoff: r9kbetaoff,

	// Send a raw message to the server
	raw(command, tags) {
		return this._sendCommand({ channel: null, command, tags }, (res, _rej) => res([ command ]));
	},

	// Send a message on a channel
	say(channel, message, tags) {
		channel = _.channel(channel);

		if((message.startsWith('.') && !message.startsWith('..')) || message.startsWith('/') || message.startsWith('\\')) {
			// Check if the message is an action message
			if(message.slice(1, 4) === 'me ') {
				return this.action(channel, message.slice(4));
			}
			else {
				return this._sendCommand({ channel, message, tags }, (res, _rej) =>
					// At this time, there is no possible way to detect if a message has been sent has been eaten
					// by the server, so we can only resolve the Promise.
					res([ channel, message ])
				);
			}
		}
		return this._sendMessage({ delay: this._getPromiseDelay(), channel, message, tags }, (res, _rej) =>
			// At this time, there is no possible way to detect if a message has been sent has been eaten
			// by the server, so we can only resolve the Promise.
			res([ channel, message ])
		);
	},

	// Enable slow mode on a channel
	slow,

	// Alias for slow()
	slowmode: slow,

	// Disable slow mode on a channel
	slowoff,

	// Alias for slowoff()
	slowmodeoff: slowoff,

	// Enable subscribers mode on a channel
	subscribers(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: '/subscribers' }, (res, rej) =>
			this.once('_promiseSubscribers', err => !err ? res([ channel ]) : rej(err))
		);
	},

	// Disable subscribers mode on a channel
	subscribersoff(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: '/subscribersoff' }, (res, rej) =>
			this.once('_promiseSubscribersoff', err => !err ? res([ channel ]) : rej(err))
		);
	},

	// Timeout username on channel for X seconds
	timeout(channel, username, seconds, reason) {
		channel = _.channel(channel);
		username = _.username(username);

		if((seconds ?? false) && !_.isInteger(seconds)) {
			reason = seconds;
			seconds = 300;
		}

		seconds = seconds ?? 300;
		reason = reason ?? '';
		return this._sendCommand({ channel, command: `/timeout ${username} ${seconds} ${reason}` }, (res, rej) =>
			this.once('_promiseTimeout', err => !err ? res([ channel, username, ~~seconds, reason ]) : rej(err))
		);
	},

	// Unban username on channel
	unban(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		return this._sendCommand({ channel, command: `/unban ${username}` }, (res, rej) =>
			this.once('_promiseUnban', err => !err ? res([ channel, username ]) : rej(err))
		);
	},

	// End the current hosting
	unhost(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ delay: 2000, channel, command: '/unhost' }, (res, rej) =>
			this.once('_promiseUnhost', err => !err ? res([ channel ]) : rej(err))
		);
	},

	// Unmod username on channel
	unmod(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		return this._sendCommand({ channel, command: `/unmod ${username}` }, (res, rej) =>
			this.once('_promiseUnmod', err => !err ? res([ channel, username ]) : rej(err))
		);
	},

	// Unvip username on channel
	unvip(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		return this._sendCommand({ channel, command: `/unvip ${username}` }, (res, rej) =>
			this.once('_promiseUnvip', err => !err ? res([ channel, username ]) : rej(err))
		);
	},

	// Add username to VIP list on channel
	vip(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		return this._sendCommand({ channel, command: `/vip ${username}` }, (res, rej) =>
			this.once('_promiseVip', err => !err ? res([ channel, username ]) : rej(err))
		);
	},

	// Get list of VIPs on a channel
	vips(channel) {
		channel = _.channel(channel);
		return this._sendCommand({ channel, command: '/vips' }, (res, rej) =>
			this.once('_promiseVips', (err, vips) => !err ? res(vips) : rej(err))
		);
	},

	// Send an whisper message to a user
	whisper(username, message) {
		username = _.username(username);

		// The server will not send a whisper to the account that sent it.
		if(username === this.getUsername()) {
			return Promise.reject('Cannot send a whisper to the same account.');
		}
		return this._sendCommand({ delay: null, channel: this._globalDefaultChannel, command: `/w ${username} ${message}` }, (_res, rej) =>
			this.once('_promiseWhisper', err => err && rej(err))
		).catch(err => {
			// Either an "actual" error occured or the timeout triggered
			// the latter means no errors have occured and we can resolve
			// else just elevate the error
			if(err && typeof err === 'string' && err.indexOf('No response from Twitch.') !== 0) {
				throw err;
			}
			const from = _.channel(username);
			const userstate = Object.assign({
				'message-type': 'whisper',
				'message-id': null,
				'thread-id': null,
				username: this.getUsername()
			}, this.globaluserstate);

			// Emit for both, whisper and message
			this.emits([ 'whisper', 'message' ], [
				[ from, userstate, message, true ],
				[ from, userstate, message, true ]
			]);
			return [ username, message ];
		});
	}
};
