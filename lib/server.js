var http = require("http");
var webSocket = require("ws");

// Hardcoded server list just in case our API request fails..
var chat_servers = ["192.16.64.145:443", "192.16.64.145:80", "192.16.70.169:80", "192.16.64.144:80", "192.16.64.51:80", "192.16.64.152:80", "192.16.64.146:80", "192.16.64.45:80", "192.16.64.155:80", "192.16.64.11:80", "199.9.248.236:80", "199.9.251.168:80", "192.16.64.37:80"]
var event_servers = ["192.16.70.170:80", "199.9.252.54:80", "192.16.64.143:80", "192.16.70.154:80", "192.16.64.150:80"]
var group_servers = ["199.9.253.119:80", "199.9.253.120:80"]

// Get a random server..
function getRandomServer(serverType, callback) {
    updateServers(function() {
        switch(serverType) {
            case "event":
            case "events":
                callback(event_servers[Math.floor(Math.random()*event_servers.length)]);
                break;
            case "group":
            case "groups":
                callback(group_servers[Math.floor(Math.random()*group_servers.length)]);
                break;
            default:
                callback(chat_servers[Math.floor(Math.random()*chat_servers.length)]);
                break;
        }
    });
}

// Update the server list using our API with CORS support..
function updateServers(callback) {
    var req = http.get({
        host: "www.tmijs.org",
        path: "/api/servers/",
        withCredentials: false,
        protocol:"http:"
    }, function(res) {
        var body = "";
        res.on("data", function(buffer) {
            body += buffer;
        });
        res.on("end", function() {
            if (res.statusCode === 200) {
                chat_servers = JSON.parse(body)["chat_servers"];
                event_servers = JSON.parse(body)["event_servers"];
                group_servers = JSON.parse(body)["group_servers"];
            }
            return callback(null);
        });
        res.on("error", function() {
            return callback(null);
        });
    });

    req.on("error", function() {
        return callback(null);
    });
}

// Detects if the server is accepting WebSocket connections..
function isWebSocket(server, port, callback) {
    try {
        var ws = new webSocket("ws://" + server + ":" + port + "/", "irc");

        ws.onerror = function () {
            return callback(false);
        };
        ws.onopen = function () {
            ws.close();
            return callback(true);
        };
    } catch(e) {
        return callback(false);
    }
}

exports.getRandomServer = getRandomServer;
exports.isWebSocket = isWebSocket;
