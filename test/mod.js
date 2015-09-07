var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("mod()", function() {
    it("should emit \"mod\"", function(done) {
        var client = new irc.client();

        client.on("mod", function(channel, username) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("schmoopiie").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":jtv MODE #schmoopiie +o schmoopiie"));
    });
});
