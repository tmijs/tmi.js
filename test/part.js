var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("part()", function() {
    it("should emit \"part\"", function(done) {
        var client = new irc.client();

        client.on("part", function(channel, username) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("schmoopiie").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv PART #schmoopiie"));
    });
});
