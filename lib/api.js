var request = require("request");
var utils = require("./utils");

var requests = 0;
var callbacks = {};

var api = function api(options, callback) {
    // Request module is accepting url or uri as an option..
    var url = typeof options.url === "undefined" ? "" : options.url;
    if (url === "") { url = typeof options.uri === "undefined" ? "" : options.uri; }

    // Prepend the URL with https://api.twitch.tv/kraken
    if (!utils.isURL(url)) {
        if (url.charAt(0) !== "/") {
            url = `https://api.twitch.tv/kraken/${url}`;
        } else {
            url = `https://api.twitch.tv/kraken${url}`;
        }
    }

    // Overwrite URL..
    options.url = url;

    // Browser..
    if (!utils.isNodeJS()) {
        // Callbacks must match the regex [a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)* according to
        // https://discuss.dev.twitch.tv/t/changes-to-jsonp-callbacks/996
        var callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            callback(null, null, data);
        };

        var script = document.createElement("script");
        script.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "callback=" + callbackName;
        document.body.appendChild(script);
    }
    // Node.JS..
    else {
        // Default options..
        var requestOptions = {
            url: url,
            method: "GET"
        };

        // Merge the options with the default options..
        request(utils.mergeRecursive(requestOptions, options), function (err, res, body) {
            callback(err, res, body);
        });
    }
}

module.exports = api;
