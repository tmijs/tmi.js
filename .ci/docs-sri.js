var fs = require('fs');
var sri = require('./sri.js');
var path = require('path');

var version = require('../package.json').version;
var readme = path.join(__dirname, '../README.md');

/**
 * Update the linked cdn version and SRI in README.md
 */
fs.readFile(process.argv[2], (err, data) => {
    if (err) throw err;
    var checksum = sri(data);

    fs.readFile(readme, (err, readmeData) => {
        if (err) throw err;

        readmeData = readmeData.toString();
        readmeData = readmeData.replace(/js\/(\d+\.)?(\d+\.)?(\*|\d+)\/tmi/g, `js/${version}/tmi`);
        readmeData = readmeData.replace(/(["'])sha384-(?:(?=(\\?))\2.)*?\1/g, `"${checksum}"`);

        fs.writeFile(readme, readmeData, (err) => {
            if (err) throw err;
            console.log(`Updated ${readme}`);
            console.log(`Version: ${version}, Checksum: ${checksum}`);
        });
    });
});
