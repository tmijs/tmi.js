var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("action()", function() {
    it("should emit \"action\"", function(done) {
        var client = new irc.client();

        client.on("action", function(channel, user, message) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            user.should.be.an.Object();
            message.should.be.exactly("Hello :)").and.be.a.String();
            done();
        });

        client.handleMessage(parse("@color=#0D4200;display-name=Schmoopiie;emotes=25:0-4,12-16/1902:6-10;subscriber=0;turbo=1;user-type=global_mod :schmoopiie!~schmoopiie@schmoopiie.tmi.twitch.tv PRIVMSG #schmoopiie :\u0001ACTION Hello :)\u0001"));
    });
});
