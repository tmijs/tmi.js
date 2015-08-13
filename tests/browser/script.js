var clientOptions = {
    options: {
        debug: true
    },
    connection: {
        random: "chat",
        reconnect: true
    },
    identity: {
        username: "Schmoopiie",
        password: "oauth:3eb787117110834e079932bedfb8e6a7"
    },
    channels: ["#schmoopiie"]
};

var client = new irc.client(clientOptions);

client.connect();

client.on("action", function(channel, user, message, self) {
    //
});

client.on("chat", function(channel, user, message, self) {
    //
});
