
// Logger implementation
const Logger = function Logger() {
	this._levels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
	this._currentLevel = 'info';
};

// Log a console message depending on the logging level
Logger.prototype._log = function log(level, message) {
	if(this._levels[level] < this._levels[this._currentLevel]) {
		return;
	}
	// Format the date
	const date = new Date();
	const h = date.getHours();
	const m  = date.getMinutes();
	const dateFormatted = `${(h < 10 ? '0' : '') + h}:${(m < 10 ? '0' : '') + m}`;
	console.log(`[${dateFormatted}] ${level}: ${message}`);
};

// Change the current logging level
Logger.prototype.setLevel = function setLevel(level) {
	this._currentLevel = level;
};
// Get the current logging level
Logger.prototype.getLevel = function getLevel() {
	return this._currentLevel;
};
Logger.prototype.trace = function trace(message) {
	this._log('trace', message);
};
Logger.prototype.debug = function debug(message) {
	this._log('debug', message);
};
Logger.prototype.info = function info(message) {
	this._log('info', message);
};
Logger.prototype.warn = function warn(message) {
	this._log('warn', message);
};
Logger.prototype.error = function error(message) {
	this._log('error', message);
};
Logger.prototype.fatal = function fatal(message) {
	this._log('fatal', message);
};

module.exports = Logger;
