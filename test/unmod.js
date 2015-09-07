var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("unmod()", function() {
    it("should emit \"unmod\"", function(done) {
        var client = new irc.client();

        client.on("unmod", function(channel, username) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            username.should.be.exactly("schmoopiie").and.be.a.String();
            done();
        });

        client.handleMessage(parse(":jtv MODE #schmoopiie -o schmoopiie"));
    });
});
