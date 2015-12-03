var webSocket = require("ws");

// Get a random server..
function getRandomServer(serverType, callback) {
    switch(serverType) {
        case "event":
        case "events":
            callback("event.tmi.twitch.tv:80");
            break;
        case "group":
        case "groups":
            callback("group.tmi.twitch.tv:80");
            break;
        default:
            callback("main.tmi.twitch.tv:80");
            break;
    }
}

// Detects if the server is accepting WebSocket connections..
function isWebSocket(server, port, callback) {
    try {
        var ws = new webSocket(`ws://${server}:${port}/`, "irc");

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
