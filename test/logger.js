const hookStd = require('hook-std');
const tmi = require('../index.js');
const log = require('../lib/logger.js');

describe('client()', () => {
	it('defaults to the stock logger', () => {
		const client = new tmi.Client();

		client.log.should.be.ok();
	});

	it('allows a custom logger', () => {
		const client = new tmi.Client({
			logger: console
		});

		client.log.should.be.exactly(console);
	});
});

describe('log()', () => {
	it('logs to the console', () => {
		let out = '';

		const unhook = hookStd.stdout({ silent: true }, output => {
			out += output;
		});

		log.setLevel('info');
		log.info('foobar');

		unhook.unhook();

		const expected = out.trim();
		expected.should.containEql('info: foobar');
	});
});
