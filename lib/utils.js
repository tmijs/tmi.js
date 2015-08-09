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
	isURL: function isURL(str) {
		var pattern = new RegExp("^(https?:\\/\\/)?" +
		"((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
		"((\\d{1,3}\\.){3}\\d{1,3}))" +
		"(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
		"(\\?[;&a-z\\d%_.~+=-]*)?" +
		"(\\#[-a-z\\d_]*)?$","i");
		if(!pattern.test(str)) {
			return false;
		} else {
			return true;
		}
	},
	normalizeChannel: function normalizeChannel(name) {
	    return "#" + ltrim(name.toLowerCase(), "#");
	},
	normalizeUsername: function normalizeUsername(username) {
	    return ltrim(username.toLowerCase(), "#");
	},
	normalizePassword: function normalizePassword(password) {
	    return "oauth:" + ltrim(password.toLowerCase(), "oauth:");
	}
}
