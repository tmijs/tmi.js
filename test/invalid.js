const tmi = require('../');

const tests = [
	'FOO',
	':tmi.twitch.tv FOO',
	':tmi.twitch.tv NOTICE #schmoopiie : FOO',
	':jtv FOO',
	':schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv FOO'
];

describe('invalid server events', () => {
	tests.forEach(test => {
		it(`treat "${test}" as invalid`, () => {
			const client = new tmi.Client({
				logger: {
					warn(message) {
						message.includes('Could not parse').should.be.ok;
					}
				}
			});

			client._onMessage({ data: test });
		});
	});
});
