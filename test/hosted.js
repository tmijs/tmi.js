var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("hosted()", function() {
    it("should emit \"hosted\"", function(done) {
        var client = new irc.client();

        client.on("hosted", function(channel, username, viewers) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("username").and.be.a.String();
            viewers.should.be.exactly("11").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":jtv!~jtv@jtv.tmi.twitch.tv PRIVMSG #schmoopiie :Username is now hosting you for 11 viewers."));
    });
});
