var request = require("request");
var _ = require("./utils");

var api = function api(options, callback) {
    // Set the url to options.uri or options.url..
    var url = options.url || options.uri || null;

    // Make sure it is a valid url..
    if (_.isString(url) && !_.isURL(url)) {
        url = `https://api.twitch.tv/kraken${url.charAt(0) === "/" ? "" : "/"}${url}`;
        options.url = url;
    }

    // We are inside a Node application, so we can use the request module..
    if (_.isNode()) {
        request(_.defaults(options, { url: url, method: "GET", json: true }), callback);
    }
    // Inside a web application, use jsonp..
    else {
        // Callbacks must match the regex [a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*
        var callbackName = `jsonp_callback_${Math.round(100000 * Math.random())}`;
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            callback(null, null, data);
        };

        // Inject the script in the document..
        var script = document.createElement("script");
        script.src = `${url}${url.indexOf("?") >= 0 ? "&" : "?"}callback=${callbackName}`;
        document.body.appendChild(script);
    }
}

module.exports = api;
