var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("ping()", function() {
    it("should emit \"ping\"", function(done) {
        var client = new irc.client();

        client.on("ping", function() {
            done();
        });

        try { client.log.error = function(msg) {}; client.handleMessage(parse("PING :tmi.twitch.tv")); } catch(e) {}
    });
});
