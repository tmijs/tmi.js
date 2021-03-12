var tmi = require("../index.js");

describe("client()", function() {
	it("returns a new instance of itself", function() {
		var client = tmi.client();
		client.should.be.an.instanceOf(tmi.client);
	});

	it("uses the 'info' log when debug is set", function() {
		var client = new tmi.client({options: {debug: true}});
		client.should.be.ok();
	});

	it("normalize channel names", function() {
		var client = new tmi.client({channels: [ "avalonstar", "#dayvemsee" ]});
		client.opts.channels.should.eql([ "#avalonstar", "#dayvemsee" ]);
	});

	it("should default secure to true when opts.connection.server and opts.connection.port not set", () => {
		var client = new tmi.client();
		client.secure.should.eql(true);
		client = new tmi.client({connection: {}});
		client.secure.should.eql(true);
	});
	it("should default secure to false when opts.connection.server or opts.connection.port set", () => {
		var client = new tmi.client({connection: {server: "localhost"}});
		client.secure.should.eql(false);
		client = new tmi.client({connection: {port: 1}});
		client.secure.should.eql(false);
		client = new tmi.client({connection: {server: "localhost", port: 1}});
		client.secure.should.eql(false);
	});
});

describe("client getters", function() {
	it("gets options", function() {
		var opts = {options: {debug: true}};
		var client = new tmi.client(opts);
		client.getOptions().should.eql(opts);
	});

	it("gets channels", function() {
		var client = new tmi.client();
		client.getChannels().should.eql([]);
	});
});
