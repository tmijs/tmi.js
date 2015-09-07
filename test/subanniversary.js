var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("subanniversary()", function() {
    it("should emit \"subanniversary\"", function(done) {
        var client = new irc.client();

        client.on("subanniversary", function(channel, username, months) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("schmoopiie").and.be.a.String();
            months.should.be.exactly("6").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":twitchnotify!twitchnotify@twitchnotify.tmi.twitch.tv PRIVMSG #schmoopiie :schmoopiie subscribed for 6 months in a row!"));
    });
});
