var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("disconnected()", function() {
    it("should emit \"disconnected\"", function(done) {
        var client = new irc.client();

        client.on("disconnected", function(reason) {
            reason.should.be.exactly("Connection closed.").and.be.a.String();
            done();
        });

        try { client.log.error = function(msg) {}; client._onError(); } catch(e) {}
    });
});
