const assert = require('assert').strict;
const { describe } = require('mocha');

const tmi = require('../lib/index');

describe('Events', function() {
	it('emits "privmsg"', function(done) {
		const client = new tmi.Client();

		/** @param {import("../lib/message").ChatMessage} data */
		const tests = data => [
			data instanceof tmi.ChatMessage,

			typeof data.message === 'string',
			typeof data.raw === 'string',
			
			data.tags instanceof tmi.ChatMessageTags,
			data.tags.get('emotes') instanceof tmi.MessageEmotes,
			data.channel instanceof tmi.Channel,
			data.user instanceof tmi.User,
			data.client instanceof tmi.Client,
			data.messageData
		];

		client.on('privmsg', data => {
			for(const test of tests(data)) {
				assert.ok(test);
			}
			
			done();
		});

		client._onData(
			'@badge-info=;badges=;color=;display-name=Alca;emotes=;flags=;id=;mod=0;room-id=;tmi-sent-ts=1560000000000;user-id=7676884; :alca!alca@alca.tmi.twitch.tv PRIVMSG #alca :Test message'
		);
	});
	it('privmsg is parsed correctly', function(done) {
		const client = new tmi.Client();

		const raw = '@badge-info=subscriber/25;badges=broadcaster/1,subscriber/12,overwatch-league-insider_2019A/1;color=#177DE3;display-name=Alca;emotes=25:13-17,29-33/70433:19-27;flags=;id=b2e3d732-353a-436e-95ca-354cad588260;mod=0;room-id=7676884;subscriber=1;tmi-sent-ts=1564648902618;turbo=0;user-id=7676884;user-type= :alca!alca@alca.tmi.twitch.tv PRIVMSG #alca :Test message Kappa KappaRoss Kappa';

		/** @param {import("../lib/message").ChatMessage} data */
		const tests = data => [
			// Raw IRC message
			{ actual: data.raw, expected: raw },

			// Text message
			{
				actual: data.message,
				expected: 'Test message Kappa KappaRoss Kappa'
			},

			// Channel
			{ actual: data.channel.client, expected: client },
			{ actual: data.channel.name, expected: '#alca' },
			{ actual: data.channel.login, expected: 'alca' },
			{ actual: data.channel.id, expected: '7676884' },
			{ actual: data.channel.roomUUID, expected: null },
			{ actual: data.channel.isChatRoom, expected: false },

			// User
			{ actual: data.user.channel, expected: data.channel },
			{ actual: data.user.color, expected: '#177DE3' },
			{ actual: data.user.displayName, expected: 'Alca' },
			{ actual: data.user.id, expected: '7676884' },
			{ actual: data.user.login, expected: 'alca' },
			{ actual: data.user.isBroadcaster(), expected: true },
			{ actual: data.user.isSub(), expected: true },
			{ actual: data.user.isMod(), expected: false },
			{ actual: data.user.isVIP(), expected: false },
			{ actual: data.user.monthsSubbed(), expected: 25 },

			// Badge Info
			{ actual: data.user.badgeInfo.get('subscriber'), expected: '25' },

			// Badges
			{ actual: data.user.badges.get('broadcaster'), expected: '1' },
			{ actual: data.user.badges.get('subscriber'), expected: '12' },
			{
				actual: data.user.badges.get('overwatch-league-insider_2019A'),
				expected: '1'
			},

			// Tags
			{
				actual: data.tags.get('id'),
				expected: 'b2e3d732-353a-436e-95ca-354cad588260'
			},
			{ actual: data.tags.get('mod'), expected: false },
			{
				actual: data.tags.get('tmi-sent-ts'),
				expected: '1564648902618'
			},
			
			// Emotes
			{
				actual: data.tags.get('emotes').raw,
				expected: '25:13-17,29-33/70433:19-27'
			},
			{
				// Kappa
				actual: data.tags.get('emotes').get('25'),
				expected: [ { start: 13, end: 18 }, { start: 29, end: 34 } ],
				assert: assert.deepStrictEqual
			},
			{
				// KappaRoss
				actual: data.tags.get('emotes').get('70433'),
				expected: [ { start: 19, end: 28 } ],
				assert: assert.deepStrictEqual
			}
		];

		client.on('privmsg', data => {
			assert.ok(data.messageData);

			for(const test of tests(data)) {
				const func = assert.strictEqual;
				(test.assert || func)(test.actual, test.expected, test.message);
			}

			done();
		});

		client._onData(raw);
	});
});