var irc = require("../index.js");

describe("client()", function() {
    it("should default to the stock logger", function() {
        var client = new irc.client();

        client.log.should.be.ok();
    });

    it("should allow a custom logger", function() {
        var client = new irc.client({
            logger: console
        });

        client.log.should.be.exactly(console);
    });
});
