var tmi = require('../src/index.js');

var tests = [
    'FOO',
    ':tmi.twitch.tv FOO',
    ':tmi.twitch.tv NOTICE #schmoopiie : FOO',
    ':jtv FOO',
    ':schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv FOO'
];

describe('invalid server events', function() {
    tests.forEach(function(test) {
        it(`should treat "${test}" as invalid`, function() {
            var client = new tmi.client({
                logger: {
                    warn: function(message) {
                        message.includes('Could not parse').should.be.ok;
                    }
                }
            });

            client._onMessage({data: test});
        });
    });
});
