var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("subscribers()", function() {
    it("should emit \"subscribers (true)\"", function(done) {
        var client = new irc.client();

        client.on("subscribers", function(channel, enabled) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            enabled.should.be.instanceof(Boolean).and.be.exactly(true);
            done();
        });

        client.handleMessage(parse("@msg-id=subs_on :tmi.twitch.tv NOTICE #schmoopiie :This room is now in subscribers-only mode."));
    });

    it("should emit \"subscribers (false)\"", function(done) {
        var client = new irc.client();

        client.on("subscribers", function(channel, enabled) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            enabled.should.be.instanceof(Boolean).and.be.exactly(false);
            done();
        });

        client.handleMessage(parse("@msg-id=subs_off :tmi.twitch.tv NOTICE #schmoopiie :This room is no longer in subscribers-only mode."));
    });
});
