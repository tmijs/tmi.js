var request = require("request");
var _ = require("./utils");

var api = function api(options, callback) {
	// Set the url to options.uri or options.url..
	var url = options.url !== undefined ? options.url : options.uri;

	// Make sure it is a valid url..
	if(!_.isURL(url)) {
		url = `https://api.twitch.tv/kraken${url[0] === "/" ? url : `/${url}`}`;
	}

	// We are inside a Node application, so we can use the request module..
	if(_.isNode()) {
		var opts = _.merge({ method: "GET", json: true }, options, { url });
		request(opts, callback);
	}
	// Web application, extension, React Native etc.
	else {
		options = _.merge({ url, method: "GET", headers: {} }, options);
		// prepare request
		var xhr = new XMLHttpRequest();
		xhr.open(options.method, options.url, true);
		for(var name in options.headers) {
			xhr.setRequestHeader(name, options.headers[name]);
		}
		xhr.responseType = "json";
		// set request handler
		xhr.addEventListener("load", ev => {
			if(xhr.readyState == 4) {
				if(xhr.status != 200) {
					callback(xhr.status, null, null);
				}
				else {
					callback(null, null, xhr.response);
				}
			}
		});
		// submit
		xhr.send();
	}
}

module.exports = api;
