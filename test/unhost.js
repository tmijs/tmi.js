var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("unhost()", function() {
    it("should emit \"unhost\"", function(done) {
        var client = new irc.client();

        client.on("unhost", function(channel, viewers) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            viewers.should.be.exactly("0").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":tmi.twitch.tv HOSTTARGET #schmoopiie :- 0"));
    });
});
