var request = require("request");
var utils = require("./utils");

var requests = 0;
var callbacks = {};

module.exports = {
    // WORK IN PROGRESS.
    // Very basic GET API function..
    // E.g: client.api.get("https://api.twitch.tv/kraken/streams?channel=lirik", function (data) { console.log(data); });
    get: function (url, callback) {
        // Browser..
        if (!utils.isNodeJS()) {
            var callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                callback(data);
            };

            var script = document.createElement("script");
            script.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "callback=" + callbackName;
            document.body.appendChild(script);
        }
        // Node.JS..
        else {
            request(url, function (err, res, body) {
                callback(body);
            })
        }
    }
};
