var tmi = require('../src/index.js');

var tests = [
    ':tmi.twitch.tv 002',
    ':tmi.twitch.tv 003',
    ':tmi.twitch.tv 004',
    ':tmi.twitch.tv 375',
    ':tmi.twitch.tv 376',
    ':tmi.twitch.tv CAP',
    '@msg-id=host_on :tmi.twitch.tv NOTICE #schmoopiie',
    '@msg-id=host_off :tmi.twitch.tv NOTICE #schmoopiie',
    '@msg-id=slow_on :tmi.twitch.tv NOTICE #schmoopiie',
    '@msg-id=slow_off :tmi.twitch.tv NOTICE #schmoopiie',
    ':schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv 366'
];

describe('no-op server events', function() {
    tests.forEach(function(test) {
        it(`should treat "${test}" as a no-op`, function() {
            var stopTest = function() {
                'Should not call this'.should.not.be.ok();
            };

            var client = new tmi.client({
                logger: {
                    trace: stopTest,
                    debug: stopTest,
                    info: stopTest,
                    warn: stopTest,
                    error: stopTest,
                    fatal: stopTest
                }
            });

            client._onMessage({data: test});
        });
    });
});
