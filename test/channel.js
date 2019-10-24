const assert = require('assert').strict;
const { describe } = require('mocha');

const tmi = require('../lib/index');

describe('say()', () => {
	it('calls client.say()', (done) => {
		let client = new tmi.Client();
		let channel = new tmi.Channel(client, 'sayChannel');
		let message = 'sayMessage';
		client.say = (sayChannel, sayMessage) => {
			assert.equal(sayChannel, channel.toIRC());
			assert.equal(sayMessage, message);
			done();
		};
		
		// Query result
		channel.say(message);
	})
});

describe('whisper()', () => {
	it('calls client.whisper()', (done) => {
		let client = new tmi.Client();
		let channel = new tmi.Channel(client, 'whisperChannel');
		let message = 'whisperMessage';
		client.whisper = (whisperChannel, whisperMessage) => {
			assert.equal(whisperChannel, channel);
			assert.equal(whisperMessage, message);
			done();
		};
		
		// Query result
		channel.whisper(message);
	})
});