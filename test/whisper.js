var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("whisper()", function() {
    it("should emit \"whisper\"", function(done) {
        var client = new irc.client();

        client.on("whisper", function(username, message) {
            username.should.be.exactly("schmoopiie").and.be.a.String();
            message.should.be.exactly("Hello! ;-)").and.be.a.String();
            done();
        });

        client.handleMessage(parse("@color=#FFFFFF;display-name=Schmoopiie;emotes=;turbo=1;user-type= :schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv WHISPER martinlarouche :Hello! ;-)"));
    });
});
