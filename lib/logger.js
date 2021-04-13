const _ = require('./utils');

let currentLevel = 'info';
const levels = { 'trace': 0, 'debug': 1, 'info': 2, 'warn': 3, 'error': 4, 'fatal': 5 };

// Logger implementation..
function log(level) {
	// Return a console message depending on the logging level..
	return function(message) {
		if(levels[level] >= levels[currentLevel]) {
			console.log(`[${_.formatDate(new Date())}] ${level}: ${message}`);
		}
	};
}

module.exports = {
	// Change the current logging level..
	setLevel(level) {
		currentLevel = level;
	},
	trace: log('trace'),
	debug: log('debug'),
	info: log('info'),
	warn: log('warn'),
	error: log('error'),
	fatal: log('fatal')
};
