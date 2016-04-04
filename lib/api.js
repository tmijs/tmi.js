var request = require("request");
var _ = require("./utils");

var api = function api(options, callback) {
    var url = _.get(options.url, null) === null ? _.get(options.uri, null) : _.get(options.url, null);

    if (!_.isURL(url)) { url = url.charAt(0) === "/" ? `https://api.twitch.tv/kraken${url}` : `https://api.twitch.tv/kraken/${url}`; }

    if (_.isNode()) {
        request(_.merge(options, { url: url, method: "GET", json: true }), function (err, res, body) {
            callback(err, res, body);
        });
    } else {
        // Callbacks must match the regex [a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)* according to https://discuss.dev.twitch.tv/t/changes-to-jsonp-callbacks/996
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
}

module.exports = api;
