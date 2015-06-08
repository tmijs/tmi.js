var options = {
    options: {
        debug: true
    },
    connection: {
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

twitch.on("connecting", function(address, port){
  console.log("CONNECTING EVENT");
});

twitch.on("logon", function(){
    console.log("LOGON EVENT");
});

twitch.on("connected", function(){
    console.log("CONNECTED EVENT");
});