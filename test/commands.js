var WebSocketServer = require('ws').Server;
var tmi = require('../index.js');

var noop = function() {};

var tests = [{
    command: 'ban',
    inputParams: ['#local7000', 'baduser', 'some reason'],
    returnedParams: ['#local7000', 'baduser', 'some reason'],
    serverTest: '/ban',
    serverCommand: '@msg-id=ban_success :tmi.twitch.tv NOTICE #local7000 :baduser',
    errorCommands: [
        '@msg-id=already_banned :tmi.twitch.tv NOTICE #local7000 :baduser',
        '@msg-id=bad_ban_admin :tmi.twitch.tv NOTICE #local7000 :baduser',
        '@msg-id=bad_ban_broadcaster :tmi.twitch.tv NOTICE #local7000 :baduser',
        '@msg-id=bad_ban_global_mod :tmi.twitch.tv NOTICE #local7000 :baduser',
        '@msg-id=bad_ban_self :tmi.twitch.tv NOTICE #local7000 :baduser',
        '@msg-id=bad_ban_staff :tmi.twitch.tv NOTICE #local7000 :baduser',
        '@msg-id=usage_ban :tmi.twitch.tv NOTICE #local7000 :baduser'
    ]
}, {
    command: 'clear',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/clear',
    serverCommand: ':tmi.twitch.tv CLEARCHAT',
    errorCommands: [
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_clear :tmi.twitch.tv NOTICE #local7000 : Usage: "/clear" - Clear chat history for all users in this room.'
    ]
}, {
    command: 'color',
    inputParams: ['#local7000', '#c0ffee'],
    returnedParams: ['#c0ffee'],
    serverTest: '#c0ffee',
    serverCommand: '@msg-id=color_changed :tmi.twitch.tv NOTICE #local7000 :#c0ffee',
    errorCommands: [
        '@msg-id=turbo_only_color :tmi.twitch.tv NOTICE #local7000 : Turbo colors are not available.',
        '@msg-id=usage_color :tmi.twitch.tv NOTICE #local7000 : Usage: "/color " - Change your username color.'
    ]
}, {
    command: 'color',
    inputParams: ['#c0ffee'],
    returnedParams: ['#c0ffee'],
    serverTest: '#c0ffee',
    serverCommand: '@msg-id=color_changed :tmi.twitch.tv NOTICE #local7000 :#c0ffee'
}, {
    command: 'commercial',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000', 30],
    serverTest: '/commercial',
    serverCommand: '@msg-id=commercial_success :tmi.twitch.tv NOTICE #local7000 :30',
    errorCommands: [
        '@msg-id=bad_commercial_error :tmi.twitch.tv NOTICE #local7000 : Failed to start commercial.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_commercial :tmi.twitch.tv NOTICE #local7000 : Usage: "/commercial [length]"'
    ]
}, {
    command: 'commercial',
    inputParams: ['#local7000', 60],
    returnedParams: ['#local7000', 60],
    serverTest: '/commercial',
    serverCommand: '@msg-id=commercial_success :tmi.twitch.tv NOTICE #local7000 :60'
}, {
    command: 'emoteonly',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/emoteonly',
    serverCommand: '@msg-id=emote_only_on :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_emote_only_on :tmi.twitch.tv NOTICE #local7000 : This room is already in emote-only mode.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_emote_only_on :tmi.twitch.tv NOTICE #local7000 : Usage: "/emoteonly"'
    ]
}, {
    command: 'emoteonlyoff',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/emoteonlyoff',
    serverCommand: '@msg-id=emote_only_off :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_emote_only_off :tmi.twitch.tv NOTICE #local7000 : This room is not in emote-only mode.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_emote_only_off :tmi.twitch.tv NOTICE #local7000 : Usage: "/emoteonlyoff"'
    ]
}, {
    command: 'host',
    inputParams: ['#local7000', 'schmoopiie'],
    returnedParams: ['#local7000', 'schmoopiie', 5],
    serverTest: '/host',
    serverCommand: '@msg-id=hosts_remaining :tmi.twitch.tv NOTICE #local7000 :5',
    errorCommands: [
        '@msg-id=bad_host_error :tmi.twitch.tv NOTICE #local7000 :There was a problem hosting channel_to_host. Please try again in a minute.',
        '@msg-id=bad_host_hosting :tmi.twitch.tv NOTICE #local7000 : This channel is already hosting that channel.',
        '@msg-id=bad_host_rate_exceeded :tmi.twitch.tv NOTICE #local7000 : Host target cannot be changed more than 3 times every half hour.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_host :tmi.twitch.tv NOTICE #local7000 : Usage: "/host " - Host another channel.'
    ]
}, {
    command: 'join',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: 'JOIN #local7000',
    serverCommand: '@broadcaster-lang=;r9k=0;slow=300;subs-only=0 :tmi.twitch.tv ROOMSTATE #local7000',
    testTimeout: true
}, {
    command: 'leave',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: 'PART',
    serverCommand: function(client, ws) {
        var user = client.getUsername();
        ws.send(`:${user}! PART #local7000`);
    },
    testTimeout: true
}, {
    command: 'mod',
    inputParams: ['#local7000', 'schmoopiie'],
    returnedParams: ['#local7000', 'schmoopiie'],
    serverTest: '/mod',
    serverCommand: '@msg-id=mod_success :tmi.twitch.tv NOTICE #local7000 :schmoopiie',
    errorCommands: [
        '@msg-id=bad_mod_banned :tmi.twitch.tv NOTICE #local7000 : That user is banned in this room.',
        '@msg-id=bad_mod_mod :tmi.twitch.tv NOTICE #local7000 : They are already a moderator of this room.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_mod :tmi.twitch.tv NOTICE #local7000 : Usage: "/mod " - Grant mod status to a user.'
    ]
}, {
    command: 'mods',
    inputParams: ['#local7000'],
    returnedParams: ['barry', 'baz'],
    serverTest: '/mods',
    serverCommand: '@msg-id=room_mods :tmi.twitch.tv NOTICE #local7000 :The moderators of this room are: barry, baz',
    errorCommands: [
        '@msg-id=usage_mods :tmi.twitch.tv NOTICE #local7000 : Usage: "/mods"'
    ]
}, {
    command: 'mods',
    inputParams: ['#local7000'],
    returnedParams: [],
    serverTest: '/mods',
    serverCommand: '@msg-id=no_mods :tmi.twitch.tv NOTICE #local7000'
}, {
    command: 'part',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: 'PART',
    serverCommand: function(client, ws) {
        var user = client.getUsername();
        ws.send(`:${user}! PART #local7000`);
    },
    testTimeout: true
}, {
    command: 'r9kbeta',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/r9kbeta',
    serverCommand: '@msg-id=r9k_on :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_r9k_on :tmi.twitch.tv NOTICE #local7000 : r9k is already on.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_r9k_on :tmi.twitch.tv NOTICE #local7000 : Usage: "/r9kbeta" - Enables r9k mode'
    ]
}, {
    command: 'r9kbetaoff',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/r9kbetaoff',
    serverCommand: '@msg-id=r9k_off :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_r9k_off :tmi.twitch.tv NOTICE #local7000 : r9k is already off.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_r9k_off :tmi.twitch.tv NOTICE #local7000 : Usage: "/r9kbetaoff" - Disables r9k mode'
    ]
}, {
    command: 'r9kmode',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/r9kbeta',
    serverCommand: '@msg-id=r9k_on :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_r9k_on :tmi.twitch.tv NOTICE #local7000 : r9k is already on.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_r9k_on :tmi.twitch.tv NOTICE #local7000 : Usage: "/r9kbeta" - Enables r9k mode'
    ]
}, {
    command: 'r9kmodeoff',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/r9kbetaoff',
    serverCommand: '@msg-id=r9k_off :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_r9k_off :tmi.twitch.tv NOTICE #local7000 : r9k is already off.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_r9k_off :tmi.twitch.tv NOTICE #local7000 : Usage: "/r9kbetaoff" - Disables r9k mode'
    ]
}, {
    command: 'raw',
    inputParams: ['/slowoff'],
    returnedParams: ['/slowoff'],
    serverTest: '/slowoff',
    serverCommand: '@slow=0 :tmi.twitch.tv ROOMSTATE'
}, {
    command: 'slow',
    inputParams: ['#local7000', 150],
    returnedParams: ['#local7000', 150],
    serverTest: '/slow',
    serverCommand: '@slow=150 :tmi.twitch.tv ROOMSTATE',
    errorCommands: [
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_slow_on :tmi.twitch.tv NOTICE #local7000 : Usage: "/slow [duration]"'
    ]
}, {
    command: 'slow',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000', 300],
    serverTest: '/slow',
    serverCommand: '@slow=300 :tmi.twitch.tv ROOMSTATE'
}, {
    command: 'slowoff',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/slowoff',
    serverCommand: '@slow=0 :tmi.twitch.tv ROOMSTATE',
    errorCommands: [
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_slow_off :tmi.twitch.tv NOTICE #local7000 : Usage: "/slowoff"'
    ]
}, {
    command: 'slowmode',
    inputParams: ['#local7000', 150],
    returnedParams: ['#local7000', 150],
    serverTest: '/slow',
    serverCommand: '@slow=150 :tmi.twitch.tv ROOMSTATE',
    errorCommands: [
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_slow_on :tmi.twitch.tv NOTICE #local7000 : Usage: "/slow [duration]"'
    ]
}, {
    command: 'slowmode',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000', 300],
    serverTest: '/slow',
    serverCommand: '@slow=300 :tmi.twitch.tv ROOMSTATE'
}, {
    command: 'slowmodeoff',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/slowoff',
    serverCommand: '@slow=0 :tmi.twitch.tv ROOMSTATE',
    errorCommands: [
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_slow_off :tmi.twitch.tv NOTICE #local7000 : Usage: "/slowoff"'
    ]
}, {
    command: 'subscribers',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/subscribers',
    serverCommand: '@msg-id=subs_on :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_subs_on :tmi.twitch.tv NOTICE #local7000 : This room is already in subscribers-only mode.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_subs_on :tmi.twitch.tv NOTICE #local7000 : Usage: "/subscribers"'
    ]
}, {
    command: 'subscribersoff',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/subscribersoff',
    serverCommand: '@msg-id=subs_off :tmi.twitch.tv NOTICE #local7000',
    errorCommands: [
        '@msg-id=already_subs_off :tmi.twitch.tv NOTICE #local7000 : This room is not in subscribers-only mode.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_subs_off :tmi.twitch.tv NOTICE #local7000 : Usage: "/subscribersoff"'
    ]
}, {
    command: 'timeout',
    inputParams: ['#local7000', 'baduser', 9000],
    returnedParams: ['#local7000', 'baduser', 9000],
    serverTest: '/timeout',
    serverCommand: '@msg-id=timeout_success :tmi.twitch.tv NOTICE #local7000 :9000',
    errorCommands: [
        '@msg-id=bad_timeout_admin :tmi.twitch.tv NOTICE #local7000 : You cannot timeout admin.',
        '@msg-id=bad_timeout_broadcaster :tmi.twitch.tv NOTICE #local7000 : You cannot timeout broadcaster.',
        '@msg-id=bad_timeout_global_mod :tmi.twitch.tv NOTICE #local7000 : You cannot timeout global moderator.',
        '@msg-id=bad_timeout_self :tmi.twitch.tv NOTICE #local7000 : You cannot timeout yourself.',
        '@msg-id=bad_timeout_staff :tmi.twitch.tv NOTICE #local7000 : You cannot timeout staff.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_timeout :tmi.twitch.tv NOTICE #local7000 : Usage: "/timeout [duration]"'
    ]
}, {
    command: 'timeout',
    inputParams: ['#local7000', 'baduser'],
    returnedParams: ['#local7000', 'baduser', 300],
    serverTest: '/timeout',
    serverCommand: '@msg-id=timeout_success :tmi.twitch.tv NOTICE #local7000 :300'
}, {
    command: 'unban',
    inputParams: ['#local7000', 'baduser'],
    returnedParams: ['#local7000', 'baduser'],
    serverTest: '/unban',
    serverCommand: '@msg-id=unban_success :tmi.twitch.tv NOTICE #local7000 :baduser',
    errorCommands: [
        '@msg-id=bad_unban_no_ban :tmi.twitch.tv NOTICE #local7000 : That user is not banned from this room.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_unban :tmi.twitch.tv NOTICE #local7000 : Usage: "/unban "'
    ]
}, {
    command: 'unban',
    inputParams: ['#local7000', 'baduser'],
    returnedParams: ['#local7000', 'baduser'],
    serverTest: '/unban',
    serverCommand: '@msg-id=untimeout_success :tmi.twitch.tv NOTICE #local7000 :baduser'
}, {
    command: 'unhost',
    inputParams: ['#local7000'],
    returnedParams: ['#local7000'],
    serverTest: '/unhost',
    serverCommand: ':tmi.twitch.tv HOSTTARGET #local7000 :- 0',
    errorCommands: [
        '@msg-id=not_hosting :tmi.twitch.tv NOTICE #local7000 : No channel is currently being hosted.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_unhost :tmi.twitch.tv NOTICE #local7000 : Usage: "/unhost"'
    ]
}, {
    command: 'unmod',
    inputParams: ['#local7000', 'moddymcmodface'],
    returnedParams: ['#local7000', 'moddymcmodface'],
    serverTest: '/unmod',
    serverCommand: '@msg-id=unmod_success :tmi.twitch.tv NOTICE #local7000 :moddymcmodface',
    errorCommands: [
        '@msg-id=bad_unmod_mod :tmi.twitch.tv NOTICE #local7000 : That user is not a moderator of this room.',
        '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 : You don\'t have permission.',
        '@msg-id=usage_unmod :tmi.twitch.tv NOTICE #local7000 : Usage: "/unmod "'
    ]
}, {
    command: 'whisper',
    inputParams: ['moddymcmodface', 'You got unmodded! D:'],
    returnedParams: ['moddymcmodface', 'You got unmodded! D:'],
    serverTest: '/w',
    serverCommand: ':tmi.twitch.tv WHISPER moddymcmodface :You got unmodded! D:'
}];

describe('commands (justinfan)', function() {
    beforeEach(function() {
        // Initialize websocket server
        this.server = new WebSocketServer({port: 7000});
        this.client = new tmi.client({
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

    it('should handle commands when disconnected', function(cb) {
        this.client.subscribers('local7000').then(noop, function(err) {
            err.should.eql('Not connected to server.');
            cb();
        });
    });

    it('should handle ping', function(cb) {
        var client = this.client;
        var server = this.server;

        server.on('connection', function(ws) {
            ws.on('message', function(message) {
                if (~message.indexOf('PING')) {
                    ws.send('PONG');
                }
            });
        });

        client.on('logon', function() {
            client.ping().then(function(latency) {
                latency.should.be.ok();
                client.disconnect();
                cb();
            });
        });

        client.connect();
    });

    it('should handle ping timeout', function(cb) {
        var client = this.client;
        var server = this.server;

        server.on('connection', function(ws) {
            ws.on('message', function(message) {
                ws.send('dummy');
            });
        });

        client.on('logon', function() {
            client.ping().then(noop, function(err) {
                err.should.be.ok();
                cb();
            });
        });

        client.connect();
    });

    tests.forEach(function(test) {
        it(`should handle ${test.command}`, function(cb) {
            var client = this.client;
            var server = this.server;

            server.on('connection', function(ws) {
                ws.on('message', function(message) {
                    // Ensure that the message starts with USER
                    if (!message.indexOf('USER')) {
                        var user = client.getUsername();
                        ws.send(`:${user}! JOIN #local7000`);
                        return;
                    }
                    // Otherwise, send the command
                    if (~message.indexOf(test.serverTest)) {
                        if (typeof test.serverCommand === 'function') {
                            test.serverCommand(client, ws);
                        } else {
                            ws.send(test.serverCommand);
                        }
                    }
                });
            });

            client.on('join', function() {
                client[test.command].apply(this, test.inputParams).then(function(data) {
                    test.returnedParams.forEach(function(param, index) {
                        data[index].should.eql(param);
                    });
                    client.disconnect();
                    cb();
                });
            });

            client.connect();
        });

        if (test.errorCommands) {
            test.errorCommands.forEach(function(error) {
                it(`should handle ${test.command} errors`, function(cb) {
                    var client = this.client;
                    var server = this.server;

                    server.on('connection', function(ws) {
                        ws.on('message', function(message) {
                            // Ensure that the message starts with USER
                            if (!message.indexOf('USER')) {
                                var user = client.getUsername();
                                ws.send(`:${user}! JOIN #local7000`);
                                return;
                            }
                            // Otherwise, send the command
                            if (~message.indexOf(test.serverTest)) {
                                ws.send(error);
                            }
                        });
                    });

                    client.on('join', function() {
                        client[test.command].apply(this, test.inputParams).then(noop, function(err) {
                            err.should.be.ok();
                            client.disconnect();
                            cb();
                        });
                    });

                    client.connect();
                });
            });
        }

        if (test.testTimeout) {
            it(`should handle ${test.command} timeout`, function(cb) {
                var client = this.client;
                var server = this.server;

                server.on('connection', function(ws) {
                    ws.on('message', function(message) {
                        // Ensure that the message starts with USER
                        if (!message.indexOf('USER')) {
                            ws.send(`dummy`);
                            return;
                        }
                    });
                });

                client.on('logon', function() {
                    client[test.command].apply(this, test.inputParams).then(noop, function(err) {
                        err.should.be.ok();
                        client.disconnect();
                        cb();
                    });
                });

                client.connect();
            });
        }
    });
});

describe('commands (identity)', function() {
    beforeEach(function() {
        // Initialize websocket server
        this.server = new WebSocketServer({port: 7000});
        this.client = new tmi.client({
            connection: {
                server: 'localhost',
                port: 7000
            },
            identity: {
                username: 'schmoopiie'
            }
        });
    });

    afterEach(function() {
        // Shut down websocket server
        this.server.close();
        this.client = null;
    });

    it(`should handle action`, function(cb) {
        var client = this.client;
        var server = this.server;

        server.on('connection', function(ws) {
            ws.on('message', function(message) {
                if (~message.indexOf('Hello')) {
                    ws.send(':tmi.twitch.tv PRIVMSG #local7000 :\u0001ACTION Hello :)\u0001');
                }
            });
        });

        client.on('logon', function() {
            client.action('#local7000', 'Hello').then(function (data) {
                data[0].should.eql('#local7000');
                data[1].should.eql('\u0001ACTION Hello\u0001');
                client.disconnect();
                cb();
            });
        });

        client.connect();
    });

    it(`should handle say`, function(cb) {
        var client = this.client;
        var server = this.server;

        server.on('connection', function(ws) {
            ws.on('message', function(message) {
                if (~message.indexOf('Hello')) {
                    ws.send(':tmi.twitch.tv PRIVMSG #local7000 : Hello');
                }
            });
        });

        client.on('logon', function() {
            client.say('#local7000', 'Hello').then(function (data) {
                data[0].should.eql('#local7000');
                data[1].should.eql('Hello');
                client.disconnect();
                cb();
            });
        });

        client.connect();
    });

    it(`should handle say when disconnected`, function(cb) {
        this.client.say('#local7000', 'Hello!').then(noop, function(err) {
            err.should.eql('Not connected to server.');
            cb();
        });
    });

    it(`should break up long messages (> 500 characters)`, function(cb) {
        var client = this.client;
        var server = this.server;
        var lorem = `lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem
                     lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem
                     lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem
                     lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem
                     lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem
                     lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem
                     lorem lorem lorem lorem lorem lorem lorem lorem ipsum`;
        var calls = 0;

        server.on('connection', function(ws) {
            ws.on('message', function(message) {
                if (~message.indexOf('PRIVMSG')) {
                    ws.send(`:tmi.twitch.tv PRIVMSG #local7000 : ${message.split(':')[1]}`);
                }
            });
        });

        client.on('chat', function(channel, user, message) {
            calls++;
            if (calls > 1) {
                message.should.containEql('ipsum');
                client.disconnect();
                cb();
            }
        });

        client.on('logon', function() {
            client.say('#local7000', lorem);
        });

        client.connect();
    });

    ['/me', '\\me', '.me'].forEach(function(me) {
        it(`should handle ${me} say`, function(cb) {
            var client = this.client;
            var server = this.server;

            server.on('connection', function(ws) {
                ws.on('message', function(message) {
                    if (~message.indexOf('Hello')) {
                        ws.send(':tmi.twitch.tv PRIVMSG #local7000 : Hello');
                    }
                });
            });

            client.on('logon', function() {
                client.say('#local7000', `${me} Hello`).then(function (data) {
                    data[0].should.eql('#local7000');
                    data[1].should.eql('\u0001ACTION Hello\u0001');
                    client.disconnect();
                    cb();
                });
            });

            client.connect();
        });
    });

    ['.', '/', '\\'].forEach(function(prefix) {
        it(`should handle ${prefix} say`, function(cb) {
            var client = this.client;

            client.on('logon', function() {
                client.say('#local7000', `${prefix}FOO`).then(function (data) {
                    data[0].should.eql('#local7000');
                    data.length.should.eql(2);
                    client.disconnect();
                    cb();
                });
            });

            client.connect();
        });
    });

    ['..'].forEach(function(prefix) {
        it(`should handle ${prefix}message say`, function(cb) {
            var client = this.client;

            client.on('logon', function() {
                client.say('#local7000', `${prefix}FOO`).then(function (data) {
                    data[0].should.eql('#local7000');
                    data[1].should.eql(`${prefix}FOO`);
                    data.length.should.eql(2);
                    client.disconnect();
                    cb();
                });
            });

            client.connect();
        });
    });
});
