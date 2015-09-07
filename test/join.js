var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("join()", function() {
    it("should emit \"join\"", function(done) {
        var client = new irc.client();

        client.on("join", function(channel, username) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("schmoopiie").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv JOIN #schmoopiie"));
    });
});
