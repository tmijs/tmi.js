var request = require("request");
var _ = require("./utils");

var api = function api(options, callback) {
    // Set the url to options.uri or options.url..
    var url = _.get(options.url, null) === null ? _.get(options.uri, null) : _.get(options.url, null);

    // Make sure it is a valid url..
    if (!_.isURL(url)) { url = url.charAt(0) === "/" ? `https://api.twitch.tv/kraken${url}` : `https://api.twitch.tv/kraken/${url}`; }

    // We are inside a Node application, so we can use the request module..
    if (_.isNode()) {
        request(_.merge(options, { url: url, method: "GET", json: true }), function (err, res, body) {
            callback(err, res, body);
        });
    }
    // Inside an extension -> we cannot use jsonp!
    else if (_.isExtension()) {
      options = _.merge(options, { url: url, method: "GET", headers: {} })
      // prepare request
      var xhr = new XMLHttpRequest();
      xhr.open(options.method, options.url, true);
      for(var name in options.headers) {
        xhr.setRequestHeader(name, options.headers[name]);
      }
      xhr.responseType = "json";
      // set request handler
      xhr.addEventListener("load", (ev) => {
        if(xhr.readyState == 4) {
          if(xhr.status != 200) {
            callback(xhr.status, null, null);
          } else {
            callback(null, null, xhr.response);
          }
        }
      });
      // submit
      xhr.send();
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
