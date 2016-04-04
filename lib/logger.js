var currentLevel = "info";
var levels = { "trace": 0, "debug": 1, "info": 2, "warn": 3, "error": 4, "fatal": 5 }

function log(level) {
    return function (message) {
        if (levels[level] >= levels[currentLevel]) {
            console.log(`[${getDateTime()}] ${level}: ${message}`);
        }
    }
}

function getDateTime() {
    var date = new Date();

    var hours = date.getHours();
    var mins  = date.getMinutes();

    hours = (hours < 10 ? "0" : "") + hours;
    mins = (mins < 10 ? "0" : "") + mins;

    return hours + ":" + mins + ((hours >= 12) ? "pm" : "am");
}

module.exports = {
    setLevel: function(level) {
        currentLevel = level;
    },
    trace: log("trace"),
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    fatal: log("fatal")
};
