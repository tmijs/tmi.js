var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("r9kbeta()", function() {
    it("should emit \"r9kbeta (true)\"", function(done) {
        var client = new irc.client();

        client.on("r9kbeta", function(channel, enabled) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            enabled.should.be.instanceof(Boolean).and.be.exactly(true);
            done();
        });

        client.handleMessage(parse("@msg-id=r9k_on :tmi.twitch.tv NOTICE #schmoopiie :This room is now in r9k mode."));
    });

    it("should emit \"r9kbeta (false)\"", function(done) {
        var client = new irc.client();

        client.on("r9kbeta", function(channel, enabled) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            enabled.should.be.instanceof(Boolean).and.be.exactly(false);
            done();
        });

        client.handleMessage(parse("@msg-id=r9k_off :tmi.twitch.tv NOTICE #schmoopiie :This room is no longer in r9k mode."));
    });
});
