var crypto = require("crypto");

module.exports = function checksum(input) {
    var hash = crypto.createHash("sha384").update(input, "utf8");
    var hashBase64 = hash.digest("base64");
    return `sha384-${hashBase64}`;
};
