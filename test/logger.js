const hookStd = require('hook-std');
const tmi = require('../index.js');
const log = require('../lib/logger.js');
const _ = require('../lib/utils.js');

describe('client()', function() {
	it('defaults to the stock logger', function() {
		const client = new tmi.client();

		client.log.should.be.ok();
	});

	it('allows a custom logger', function() {
		const client = new tmi.client({
			logger: console
		});

		client.log.should.be.exactly(console);
	});
});

describe('log()', function() {
	it('logs to the console', function() {
		let out = '';

		const unhook = hookStd.stdout({ silent: true }, function(output) {
			out += output;
		});

		log.setLevel('info');
		log.info('foobar');

		unhook.unhook();

		const expected = out.trim();
		expected.should.containEql('info: foobar');
	});
});

describe('_.formatDate()', function() {
	it('formats 8am', function() {
		_.formatDate(new Date('2015-01-01 8:00')).should.eql('08:00');
	});

	it('formats 8pm', function() {
		_.formatDate(new Date('2015-01-01 20:00')).should.eql('20:00');
	});

	it('formats 8.30pm', function() {
		_.formatDate(new Date('2015-01-01 20:30')).should.eql('20:30');
	});
});
