var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("timeout()", function() {
    it("should emit \"timeout\"", function(done) {
        var client = new irc.client();

        client.on("timeout", function(channel, username) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("schmoopiie").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":tmi.twitch.tv CLEARCHAT #schmoopiie :schmoopiie"));
    });
});
