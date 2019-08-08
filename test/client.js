const assert = require('assert').strict;
const { describe } = require('mocha');

const tmi = require('../lib/index');

describe('tmi.Client()', function() {
	it('returns a new instance of itself', function() {
		const client = new tmi.Client();
		assert.ok(client instanceof tmi.Client);
	});
});