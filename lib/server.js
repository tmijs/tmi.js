var webSocket = global.WebSocket || global.MozWebSocket || require("ws");

// Get a random server..
function getRandomServer(serverType, secure, callback) {
    switch(serverType) {
        case "event":
        case "events":
            if (secure) { return callback("event-ws.tmi.twitch.tv:443"); }
            callback("event.tmi.twitch.tv:80");
            break;
        case "group":
        case "groups":
            if (secure) { return callback("group-ws.tmi.twitch.tv:443"); }
            callback("group.tmi.twitch.tv:80");
            break;
        case "main":
            if (secure) { return callback("main-ws.tmi.twitch.tv:443"); }
            callback("main.tmi.twitch.tv:80");
            break;
        default:
            if (secure) { return callback("irc-ws.chat.twitch.tv:443"); }
            callback("irc-ws.chat.twitch.tv:80");
            break;
    }
}

// Detects if the server is accepting WebSocket connections..
function isWebSocket(protocol, server, port, callback) {
    try {
        var ws = new webSocket(`${protocol}://${server}:${port}/`, "irc");

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
