var irc = require('../../index.js');

var options = {
    options: {
        debug: true
    },
    connection: {
        random: "chat",
        reconnect: false,
        server: "199.9.253.119",
        port: 443
    },
    identity: {
        username: "Schmoopiie",
        password: "oauth:dek9qz62yx2zjxn8v24nxj9ekjxrna"
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

client.on("action", function(channel, user, message, self) {
    //
});

client.on("chat", function(channel, user, message, self) {
    //
});

client.on("message", function(channel, user, message, self) {
    if (message === "!test" && user["message-type"] === "action") {
        client.say(channel, "this is a test.");
    }
    if (message === "!test2" && user["message-type"] === "chat") {
        client.whisper(user.username, "this is a test.");
    }
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

client.on("subscription", function(channel, username) {
    //
});

client.on("subanniversary", function(channel, username, length) {
    //
});

client.on("mods", function(channel, mods) {
    //
});

client.on("hosted", function(channel, username) {
    //
});