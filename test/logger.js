var hookStd = require('hook-std');
var irc = require("../index.js");
var log = require("../lib/logger.js");
var _ = require("../lib/utils.js");

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

describe("log()", function() {
    it("should log to the console", function() {
        var out = '';
        
        var unhook = hookStd.stdout({silent: true}, function(output) {
            out += output;
        });
        
        log.setLevel('info');
        log.info('foobar');
        
        unhook();
        
        var expected = out.trim();
        expected.should.containEql('info: foobar');
    });
});

describe("_.formatDate()", function() {
    it("should format 8am", function() {
        _.formatDate(new Date('2015-01-01 8:00')).should.eql('08:00');
    });
    
    it("should format 8pm", function() {
        _.formatDate(new Date('2015-01-01 20:00')).should.eql('20:00');
    });
    
    it("should format 8.30pm", function() {
        _.formatDate(new Date('2015-01-01 20:30')).should.eql('20:30');
    });
});
