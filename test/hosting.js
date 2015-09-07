var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("hosting()", function() {
    it("should emit \"hosting\"", function(done) {
        var client = new irc.client();

        client.on("hosting", function(channel, target, viewers) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            target.should.be.exactly("schmoopiie").and.be.a.String();
            viewers.should.be.exactly("3").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":tmi.twitch.tv HOSTTARGET #schmoopiie :schmoopiie 3"));
    });
});
