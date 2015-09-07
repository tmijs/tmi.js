var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("pong()", function() {
    it("should emit \"pong\"", function(done) {
        var client = new irc.client();

        client.on("pong", function() {
            done();
        });

        client.handleMessage(parse("PONG :tmi.twitch.tv"));
    });
});
