const crypto = require('crypto');
const fs = require('fs');

function checksum(input) {
	const hash = crypto.createHash('sha384').update(input, 'utf8');
	const hashBase64 = hash.digest('base64');
	return `sha384-${hashBase64}`;
}

fs.readFile(process.argv[2], (err, data) => {
	if(err) {
		throw err;
	}
	console.log(`SRI Hash [${process.argv[2]}]: ${checksum(data)}`);
});
