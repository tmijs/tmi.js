var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("subscription()", function() {
    it("should emit \"subscription\"", function(done) {
        var client = new irc.client();

        client.on("subscription", function(channel, username) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("schmoopiie").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":twitchnotify!twitchnotify@twitchnotify.tmi.twitch.tv PRIVMSG #schmoopiie :schmoopiie just subscribed!"));
    });
});
