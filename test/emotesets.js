var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("emotesets()", function() {
    it("should emit \"emotesets\"", function(done) {
        var client = new irc.client();

        client.on("emotesets", function(sets) {
            sets.should.be.exactly("0").and.be.a.String();
            done();
        });

        client.handleMessage(parse("@color=#1E90FF;display-name=Schmoopiie;emote-sets=0;turbo=0;user-type= :tmi.twitch.tv GLOBALUSERSTATE"));
    });
});
