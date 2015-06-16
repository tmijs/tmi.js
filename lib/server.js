var webSocket = require("ws");

// TODO: Add more WebSocket servers..
function getRandomServer(type, ignore, callback) {
    if (type === "event" || type === "events") {

    }
    else if (type === "group" || type === "groups") {

    }
    else {
        var servers = [
            "192.16.64.145:443"
        ];
        if (servers.indexOf(ignore) >=0) { servers.splice(servers.indexOf(ignore), 1); }

        return callback(servers[Math.floor(Math.random()*servers.length)]);
    }
}

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