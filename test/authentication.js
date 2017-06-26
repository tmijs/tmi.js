var WebSocketServer = require('ws').Server;
var tmi = require('../src/index.js');

var noop = function() {};

var tests = [
    ':tmi.twitch.tv NOTICE #schmoopiie :Login unsuccessful.',
    ':tmi.twitch.tv NOTICE #schmoopiie :Error logging in.',
    ':tmi.twitch.tv NOTICE #schmoopiie :Invalid NICK.'
];

describe('handling authentication', function() {
    beforeEach(function() {
        // Initialize websocket server
        this.server = new WebSocketServer({port: 7000});
        this.client = new tmi.client({
            logger: {
                error: noop,
                info: noop
            },
            connection: {
                server: 'localhost',
                port: 7000,
                timeout: 1
            }
        });
    });

    afterEach(function() {
        // Shut down websocket server
        this.server.close();
        this.client = null;
    });

    tests.forEach(function(test) {
        it(`should handle ${test}`, function(cb) {
            var client = this.client;
            var server = this.server;

            var parts = test.split(':');
            var message = parts[parts.length - 1].trim();

            server.on('connection', function(ws) {
                ws.on('message', function(message) {
                    if (!message.indexOf('USER')) {
                        ws.send(test);
                    }
                });
            });

            client.on('disconnected', function(reason) {
                reason.should.eql(message);
                cb();
            });

            client.connect();
        });
    });
});
