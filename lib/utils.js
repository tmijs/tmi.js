var toNumber = require("underscore.string/toNumber");
var ltrim = require("underscore.string/ltrim");

module.exports = {
	generateJustinfan: function generateJustinfan() {
		return "justinfan" + Math.floor((Math.random() * 80000) + 1000);
	},
	isInteger: function isInteger(value) {
	    var maybeNumber = toNumber(value, 0);
	    return !isNaN(maybeNumber);
	},
	isNodeJS: function isNodeJS() {
		try {
			if (module.exports = 'object' === typeof process && Object.prototype.toString.call(process) === '[object process]') {
				return true;
			}
			return false;
		} catch(e) {
			return false;
		}
	},
	// RegEx by @diegoperini - https://gist.github.com/dperini/729294
	isURL: function isURL(str) {
		var pattern = new RegExp(
			"^" +
			// Protocol identifier
			"(?:(?:https?|ftp)://)" +
			// User:pass authentication
			"(?:\\S+(?::\\S*)?@)?" +
			"(?:" +
			  // IP address exclusion
			  // Private & local networks
			  "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
			  "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
			  "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
			  // IP address dotted notation octets
			  // Excludes loopback network 0.0.0.0
			  // Excludes reserved space >= 224.0.0.0
			  // Excludes network & broacast addresses
			  // (first & last IP address of each class)
			  "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
			  "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
			  "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
			"|" +
			  // Host name
			  "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
			  // Domain name
			  "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
			  // TLD identifier
			  "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
			  // TLD may end with dot
			  "\\.?" +
			")" +
			// Port number
			"(?::\\d{2,5})?" +
			// Resource path
			"(?:[/?#]\\S*)?" +
			"$", "i");
		if(!pattern.test(str)) {
			return false;
		} else {
			return true;
		}
	},
	mergeRecursive: function mergeRecursive(obj1, obj2) {
	    for (var p in obj2) {
	        try {
	            if ( obj2[p].constructor==Object ) {
	                obj1[p] = MergeRecursive(obj1[p], obj2[p]);
	            } else {
	                obj1[p] = obj2[p];
	            }
	        } catch(e) {
	            obj1[p] = obj2[p];
	        }
	    }
	    return obj1;
	},
	normalizeChannel: function normalizeChannel(name) {
	    return "#" + ltrim(name.toLowerCase(), "#");
	},
	normalizeUsername: function normalizeUsername(username) {
	    return ltrim(username.toLowerCase(), "#");
	},
	normalizePassword: function normalizePassword(password) {
		return `oauth:${password.toLowerCase().replace("oauth:", "")}`;
	},
	promiseDelay: function promiseDelay(time) {
	    return new Promise(function (resolve) {
	        setTimeout(resolve, time);
	    });
	},
	splitLine: function splitLine(input, length) {
	    var lastSpace = input.substring(0, length).lastIndexOf(" ");
	    return [input.substring(0, lastSpace), input.substring(lastSpace + 1)];
	},
	addWord: function addWord(line, word) {
	    if (line.length != 0) {
	        line += " ";
	    }
	    return(line += word);
	}
}
