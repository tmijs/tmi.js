var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("connecting()", function() {
    it("should emit \"connecting\"", function(done) {
        var client = new irc.client();

        client.on("connecting", function(address, port) {
            done();
        });

        try { client._onOpen(); } catch(e) {}
    });
});
