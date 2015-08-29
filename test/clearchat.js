var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("clearchat()", function() {
    it("should emit \"clearchat\"", function(done) {
        var client = new irc.client();

        client.on("clearchat", function(channel) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":tmi.twitch.tv CLEARCHAT #schmoopiie"));
    });
});
