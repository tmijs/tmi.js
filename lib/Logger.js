/// <reference path="../types.d.ts" />

// Logger implementation
class Logger {
	constructor() {
		this._levels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
		this._currentLevel = 'error';
	}
	// Log a console message depending on the logging level
	_log(level, message) {
		if(this._levels[level] < this._levels[this._currentLevel]) {
			return;
		}
		// Format the date
		const date = new Date();
		const h = date.getHours();
		const m = date.getMinutes();
		const dateFormatted = `${(h < 10 ? '0' : '') + h}:${(m < 10 ? '0' : '') + m}`;
		console.log(`[${dateFormatted}] ${level}: ${message}`);
	}
	// Change the current logging level
	setLevel(level) {
		this._currentLevel = level;
	}
	// Get the current logging level
	getLevel() {
		return this._currentLevel;
	}
	trace(message) {
		this._log('trace', message);
	}
	debug(message) {
		this._log('debug', message);
	}
	info(message) {
		this._log('info', message);
	}
	warn(message) {
		this._log('warn', message);
	}
	error(message) {
		this._log('error', message);
	}
	fatal(message) {
		this._log('fatal', message);
	}
}

module.exports = Logger;
