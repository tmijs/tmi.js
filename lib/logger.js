var bunyan = require("bunyan");
var _ = require("underscore");

function rawStream() {}

// Custom formatting for logger..
rawStream.prototype.write = function (rec) {
    var message = rec.msg || rec.raw;

    if(_.isObject(message) && !_.isNull(message)) {
        message = JSON.stringify(message);
    }

    var hours = rec.time.getHours();
    var minutes = rec.time.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";

    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    console.log("[%s] %s: %s", hours + ":" + minutes + ampm, bunyan.nameFromLevel[rec.level], message);
};

var createLogger = function createLogger(name, level, type) {
    return bunyan.createLogger({
        name: name,
        streams: [
            {
                level: level,
                stream: new rawStream(),
                type: type
            }
        ]
    });
}

exports.createLogger = createLogger;
