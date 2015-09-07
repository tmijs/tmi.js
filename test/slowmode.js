var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("slowmode()", function() {
    it("should emit \"slowmode (true)\"", function(done) {
        var client = new irc.client();

        client.on("slowmode", function(channel, enabled, length) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            enabled.should.be.instanceof(Boolean).and.be.exactly(true);
            length.should.be.instanceof(String).and.be.exactly("8");
            done();
        });

        client.handleMessage(parse("@slow=8 :tmi.twitch.tv ROOMSTATE #schmoopiie"));
    });

    it("should emit \"slowmode (false)\"", function(done) {
        var client = new irc.client();

        client.on("slowmode", function(channel, enabled, length) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            enabled.should.be.instanceof(Boolean).and.be.exactly(false);
            length.should.be.instanceof(String).and.be.exactly("0");
            done();
        });

        client.handleMessage(parse("@slow=0 :tmi.twitch.tv ROOMSTATE #schmoopiie"));
    });
});
