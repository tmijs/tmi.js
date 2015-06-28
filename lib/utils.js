var toNumber = require("underscore.string/toNumber");
var ltrim = require("underscore.string/ltrim");

// Generate a random justinfan username
function generateJustinfan() {
	return "justinfan" + Math.floor((Math.random() * 80000) + 1000);
}

// Determine if value is a valid integer
function isInteger(value) {
    //0 decimal places
    var maybeNumber = toNumber(value, 0);
    return isNaN(maybeNumber);
}

// Normalize channel name by including the hash
function normalizeChannel(name) {
    return "#" + ltrim(name.toLowerCase(), "#");
}

// Normalize username by removing the hash
function normalizeUsername(username) {
    return ltrim(username.toLowerCase(), "#");
}

// Normalize password by including oauth:
function normalizePassword(password) {
    return "oauth:" + ltrim(username.toLowerCase(), "oauth:");
}

exports.generateJustinfan = generateJustinfan;
exports.isInteger = isInteger;
exports.normalizeChannel = normalizeChannel;
exports.normalizeUsername = normalizeUsername;
exports.normalizePassword = normalizePassword;