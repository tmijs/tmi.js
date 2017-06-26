var tmi = require("../src/index.js");

describe("client()", function() {
    it("should return a new instance of itself", function() {
        var client = tmi.client();
        client.should.be.an.instanceOf(tmi.client);
    });
    
    it("should use the 'info' log when debug is set", function() {
        var client = new tmi.client({options: {debug: true}});
        client.should.be.ok();
    });
    
    it("should normalize channel names", function() {
        var client = new tmi.client({channels: ["avalonstar", "#dayvemsee"]});
        client.opts.channels.should.eql(["#avalonstar", "#dayvemsee"]);
    });
    
    it("should warn when random is specified (deprecated)", function() {
        var logger = {
            setLevel: function() {},
            warn: function (message) {
                message.should.be.ok();
            }
        };
        var client = new tmi.client({logger: logger, connection: {random: 'main'}});
    });
});

describe("client getters", function() {
    it("should get options", function() {
        var opts = {options: {debug: true}};
        var client = new tmi.client(opts);
        client.getOptions().should.eql(opts);
    });
    
    it("should get channels", function() {
        var client = new tmi.client();
        client.getChannels().should.eql([]);
    });
});
