const fetch = require('node-fetch');
const _ = require('./utils');

module.exports = function api(options, callback) {
	// Set the url to options.uri or options.url..
	let url = options.url !== undefined ? options.url : options.uri;

	// Make sure it is a valid url..
	if(!_.isURL(url)) {
		url = `https://api.twitch.tv/kraken${url[0] === '/' ? url : `/${url}`}`;
	}

	// We are inside a Node application, so we can use the node-fetch module..
	if(_.isNode()) {
		const opts = Object.assign({ method: 'GET', json: true }, options);
		if(opts.qs) {
			const qs = new URLSearchParams(opts.qs);
			url += `?${qs}`;
		}
		let response = {};
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
		const opts = Object.assign({ method: 'GET', headers: {} }, options, { url });
		// prepare request
		const xhr = new XMLHttpRequest();
		xhr.open(opts.method, opts.url, true);
		for(const name in opts.headers) {
			xhr.setRequestHeader(name, opts.headers[name]);
		}
		xhr.responseType = 'json';
		// set request handler
		xhr.addEventListener('load', _ev => {
			if(xhr.readyState === 4) {
				if(xhr.status !== 200) {
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
};
