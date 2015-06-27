var toNumber = require("underscore.string/toNumber"),
    ltrim = require("underscore.string/ltrim");

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
    return "#" + ltrim(name, "#");
}

// Normalize username by removing the hash
function normalizeUsername(username) {
    return ltrim(username, "#");
}

exports.generateJustinfan = generateJustinfan;
exports.isInteger = isInteger;
exports.normalizeChannel = normalizeChannel;
exports.normalizeUsername = normalizeUsername;