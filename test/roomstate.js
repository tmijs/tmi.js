var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("roomstate()", function() {
    it("should emit \"roomstate\"", function(done) {
        var client = new irc.client();

        client.on("roomstate", function(channel, state) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            state.should.be.instanceof(Object);
            done();
        });

        client.handleMessage(parse("@broadcaster-lang=;r9k=0;slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE #schmoopiie"));
    });
});
