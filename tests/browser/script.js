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

var twitch = new client(options);

twitch.connect();

twitch.on("connecting", function(server, port){
    //
});

twitch.on("logon", function(){
    //
});

twitch.on("connected", function(server, port){
    //
});

twitch.on("names", function(channel, names){
    //
});

twitch.on("action", function(channel, user, message){
    //
});

twitch.on("chat", function(channel, user, message){
    //
});

twitch.on("timeout", function(channel, username){
    //
});

twitch.on("clearchat", function(channel){
    //
});

twitch.on("hosting", function(channel, target){
    //
});

twitch.on("unhost", function(channel){
    //
});

twitch.on("subscribers", function(channel, enabled){
    //
});

twitch.on("slow", function(channel, enabled){
    //
});

twitch.on("r9kmode", function(channel, enabled){
    //
});