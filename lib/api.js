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
	// Inside an extension/ReactNative -> we cannot use jsonp!
	else if(_.isExtension() || _.isReactNative()) {
		var opts = _.merge({ url, method: "GET", headers: {} }, options);
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
	// Inside a web application, use jsonp..
	else {
		var script = document.createElement("script");
		// Callbacks must match the regex [a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*
		var callbackName = `jsonp_callback_${Math.round(100000 * Math.random())}`;
		window[callbackName] = function(data) {
			delete window[callbackName];
			document.body.removeChild(script);
			callback(null, null, data);
		};

		// Inject the script in the document..
		script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${callbackName}`;
		document.body.appendChild(script);
	}
}

module.exports = api;
