var irc = require("../index.js");
var parse = require("irc-message").parse;

describe("mods()", function() {
    it("should emit \"mods\"", function(done) {
        var client = new irc.client();

        client.on("mods", function(channel, mods) {
            channel.should.be.exactly("#schmoopiie").and.be.a.String();
            mods.should.be.instanceof(Array).and.have.lengthOf(3);
            done();
        });

        client.handleMessage(parse("@msg-id=room_mods :tmi.twitch.tv NOTICE #schmoopiie :The moderators of this room are: user1, user2, user3"));
    });
});
