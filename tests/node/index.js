var irc = require('../../index.js');

var options = {
    options: {
        debug: true
    },
    connection: {
        random: "chat",
        reconnect: false,
        server: "192.16.64.145",
        port: 443
    },
    identity: {
        username: "justinfan432543",
        password: "SCHMOOPIIE"
    },
    channels: ["#schmoopiie"]
};

var client = new irc.client(options);

client.connect();

client.on("connecting", function(server, port) {
    //
});

client.on("logon", function() {
    //
});

client.on("connected", function(server, port) {
    //
});

client.on("disconnected", function(reason) {
    //
});

client.on("names", function(channel, names) {
    //
});

client.on("action", function(channel, user, message) {
    //
});

client.on("chat", function(channel, user, message) {
    //
});

client.on("timeout", function(channel, username) {
    //
});

client.on("clearchat", function(channel) {
    //
});

client.on("hosting", function(channel, target, viewers) {
    //
});

client.on("unhost", function(channel) {
    //
});

client.on("subscribers", function(channel, enabled) {
    //
});

client.on("slow", function(channel, enabled) {
    //
});

client.on("r9kmode", function(channel, enabled) {
    //
});

client.on("join", function(channel, username) {
    //
});

client.on("part", function(channel, username) {
    //
});

client.on("roomstate", function(channel, state) {
    //
});

client.on("ping", function() {
    //
});

client.on("reconnect", function() {
    //
});

client.on("mod", function(channel, username) {
    //
});

client.on("unmod", function(channel, username) {
    //
});