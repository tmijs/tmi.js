// Generate a random justinfan username..
function generateJustinfan() {
	return "justinfan" + Math.floor((Math.random() * 80000) + 1000);
}

// Value is an integer..
function isInteger(value) {
    var n = ~~Number(value);
    return String(n) === value;
}

// Normalize channel name for Twitch..
function normalizeChannel(name) {
	if (name.indexOf("#") !== 0) { name = "#" + name; }
	return name.toLowerCase();
}

exports.generateJustinfan = generateJustinfan;
exports.isInteger = isInteger;
exports.normalizeChannel = normalizeChannel;