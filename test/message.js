const assert = require('assert').strict;
const { describe } = require('mocha');

const tmi = require('../lib/index');

describe('reply()', function() {
	it('calls channel.whisper() if the message is a whisper', (done) => {
		let client = new tmi.Client();
		let tags = new tmi.MessageTags();
		let trailing = 'replyMessage';
		let command = 'WHISPER';
		let name = 'replyName';
		let prefix = {
			name
		};
		let messageData = {};
		let params = [ '#replyChannel' ];
		let message = new tmi.ChatMessage(client, {
			client, messageData, params, trailing, prefix, tags, command
		});
		let replyWhisper = 'replyWhisper';
		message.channel.whisper = (message) => {
			assert.equal(message, replyWhisper);
			done();
		};
		message.channel.say = () => {
			done('channel.say() was called when channel.whisper() was expected');
		};
		
		// Query result
		message.reply(replyWhisper);
	});
	it('calls channel.say() if the message is not a whisper', (done) => {
		let client = new tmi.Client();
		let tags = new tmi.MessageTags();
		let trailing = 'replyMessage';
		let command = 'PRIVMSG';
		let name = 'replyName';
		let prefix = {
			name
		};
		let messageData = {};
		let params = [ '#replyChannel' ];
		let message = new tmi.ChatMessage(client, {
			client, messageData, params, trailing, prefix, tags, command
		});
		let replyMessage = 'replyMessage';
		message.channel.say = (message) => {
			assert.equal(message, replyMessage);
			done();
		};
		message.channel.whisper = () => {
			done('channel.whisper() was called when channel.say() was expected');
		};
		
		// Query result
		message.reply(replyMessage);
	});
});