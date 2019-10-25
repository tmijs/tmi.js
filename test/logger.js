var hookStd = require('hook-std');
var tmi = require("../index.js");
var log = require("../lib/logger.js");
var _ = require("../lib/utils.js");

describe("client()", function() {
	it("defaults to the stock logger", function() {
		var client = new tmi.client();

		client.log.should.be.ok();
	});

	it("allows a custom logger", function() {
		var client = new tmi.client({
			logger: console
		});

		client.log.should.be.exactly(console);
	});
});

describe("log()", function() {
	it("logs to the console", function() {
		var out = '';

		var unhook = hookStd.stdout({silent: true}, function(output) {
			out += output;
		});

		log.setLevel('info');
		log.info('foobar');

		unhook();

		var expected = out.trim();
		expected.should.containEql('info: foobar');
	});
});

describe("_.formatDate()", function() {
	it("formats 8am", function() {
		_.formatDate(new Date('2015-01-01 8:00')).should.eql('08:00');
	});

	it("formats 8pm", function() {
		_.formatDate(new Date('2015-01-01 20:00')).should.eql('20:00');
	});

	it("formats 8.30pm", function() {
		_.formatDate(new Date('2015-01-01 20:30')).should.eql('20:30');
	});
});
