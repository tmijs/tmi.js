var fetch = require("node-fetch");
var _ = require("./utils");

var api = function api(options, callback) {
	// Set the url to options.uri or options.url..
	var url = options.url !== undefined ? options.url : options.uri;

	// Make sure it is a valid url..
	if(!_.isURL(url)) {
		url = `https://api.twitch.tv/kraken${url[0] === "/" ? url : `/${url}`}`;
	}

	// We are inside a Node application, so we can use the node-fetch module..
	if(_.isNode()) {
		var opts = _.merge({ method: "GET", json: true }, options, { url });
		var url = opts.url;
		if(opts.qs) {
			var qs = new URLSearchParams(opts.qs);
			url += `?${qs}`;
		}
		var response = {};
		/** @type {ReturnType<import('node-fetch')['default']>} */
		const fetchPromise = fetch(url, {
			method: opts.method,
			headers: opts.headers,
			body: opts.body
		});
		fetchPromise.then(res => {
			response = { statusCode: res.status, headers: res.headers };
			return opts.json ? res.json() : res.text();
		})
		.then(
			data => callback(null, response, data),
			err => callback(err, response, null)
		);
	}
	// Web application, extension, React Native etc.
	else {
		var opts = _.merge({ method: "GET", headers: {} }, options, { url });
		// prepare request
		var xhr = new XMLHttpRequest();
		xhr.open(opts.method, opts.url, true);
		for(var name in opts.headers) {
			xhr.setRequestHeader(name, opts.headers[name]);
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
