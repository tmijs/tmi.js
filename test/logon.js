var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("logon()", function() {
    it("should emit \"logon\"", function(done) {
        var client = new irc.client();

        client.on("logon", function() {
            done();
        });

        try { client.log.error = function(msg) {}; client._onOpen(); } catch(e) {}
    });
});
