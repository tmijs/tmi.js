// Generate a random justinfan username..
function generateJustinfan() {
	return "justinfan" + Math.floor((Math.random() * 80000) + 1000);
}

// Value is an integer..
function isInteger(value) {
    var n = ~~Number(value);
    return String(n) === value;
}

// Normalize channel name..
function normalizeChannel(name) {
	if (name.indexOf("#") !== 0) { name = "#" + name; }
	return name.toLowerCase();
}

// Normalize username..
function normalizeUsername(username) {
	return username.replace("#", "").toLowerCase();
}

exports.generateJustinfan = generateJustinfan;
exports.isInteger = isInteger;
exports.normalizeChannel = normalizeChannel;
exports.normalizeUsername = normalizeUsername;