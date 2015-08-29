var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("connected()", function() {
    it("should emit \"connected\"", function(done) {
        var client = new irc.client();

        client.on("connected", function(address, port) {
            done();
        });

        client.handleMessage(parse(":tmi.twitch.tv 372 schmoopiie :You are in a maze of twisty passages, all alike."));
    });
});
