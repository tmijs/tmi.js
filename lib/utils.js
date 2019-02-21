var actionMessageRegex = /^\u0001ACTION ([^\u0001]+)\u0001$/;
var justinFanRegex = /^(justinfan)(\d+$)/;
var unescapeIRCRegex = /\\([sn:r\\])/g;
var ircEscapedChars = { s: ' ', n: '', ':': ';', r: '' };
var self = module.exports = {
    // Return the second value if the first value is undefined..
    get: (obj1, obj2) => { return typeof obj1 === "undefined" ? obj2 : obj1; },

    // Value is a boolean..
    isBoolean: (obj) => { return typeof(obj) === "boolean"; },

    // Value is a finite number..
    isFinite: (int) => { return isFinite(int) && !isNaN(parseFloat(int)); },

    // Value is an integer..
    isInteger: (int) => { return !isNaN(self.toNumber(int, 0)); },

    // Username is a justinfan username..
    isJustinfan: (username) => { return justinFanRegex.test(username); },

    // Value is null..
    isNull: (obj) => { return obj === null; },

    // Value is a regex..
    isRegex: (str) => { return /[\|\\\^\$\*\+\?\:\#]/.test(str); },

    // Value is a string..
    isString: (str) => { return typeof(str) === "string"; },

    // Value is a valid url..
    isURL: (str) => { return RegExp("^(?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)(?::\\d{2,5})?(?:[/?#]\\S*)?$","i").test(str); },

    // Return a random justinfan username..
    justinfan: () => { return `justinfan${Math.floor((Math.random() * 80000) + 1000)}`; },

    // Return a valid password..
    password: (str) => { return ["SCHMOOPIIE", "", null].includes(str) ? "SCHMOOPIIE" : `oauth:${str.toLowerCase().replace("oauth:", "")}`; },

    // Race a promise against a delay..
    promiseDelay: (time) => { return new Promise(function (resolve) { setTimeout(resolve, time); }); },

    // Replace all occurences of a string using an object..
    replaceAll: (str, obj) => {
        if (str === null || typeof str === "undefined") { return null; }
        for (var x in obj) {
            str = str.replace(new RegExp(x, "g"), obj[x]);
        }
        return str;
    },

    unescapeHtml: (safe) => {
        return safe.replace(/\\&amp\\;/g, "&")
            .replace(/\\&lt\\;/g, "<")
            .replace(/\\&gt\\;/g, ">")
            .replace(/\\&quot\\;/g, "\"")
            .replace(/\\&#039\\;/g, "'");
    },

    // Escaping values: http://ircv3.net/specs/core/message-tags-3.2.html#escaping-values
    unescapeIRC: (msg) => {
        return !msg || !msg.includes('\\') ? msg : msg.replace(unescapeIRCRegex, (m, p) => { return p in ircEscapedChars ? ircEscapedChars[p] : p });
    },

    actionMessage: (msg) => {
        return msg.match(actionMessageRegex);
    },

    // Add word to a string..
    addWord: (line, word) => {
        return line.length ? line + " " + word : line + word;
    },

    // Return a valid channel name..
    channel: (str) => {
        var channel = (str ? str : "").toLowerCase();
        return channel[0] === "#" ? channel : "#" + channel;
    },

    // Extract a number from a string..
    extractNumber: (str) => {
        var parts = str.split(" ");
        for (var i = 0; i < parts.length; i++) {
            if (self.isInteger(parts[i])) { return ~~parts[i]; }
        }
        return 0;
    },

    // Format the date..
    formatDate: (date) => {
        var hours = date.getHours();
        var mins  = date.getMinutes();

        hours = (hours < 10 ? "0" : "") + hours;
        mins = (mins < 10 ? "0" : "") + mins;

        return `${hours}:${mins}`;
    },

    // Inherit the prototype methods from one constructor into another..
    inherits: (ctor, superCtor) => {
        ctor.super_ = superCtor
        var TempCtor = function () {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
    },

    // Return whether inside a Node application or not..
    isNode: () => {
        try {
            if (module.exports = "object" === typeof process && Object.prototype.toString.call(process) === "[object process]") { return true; }
            return false;
        } catch(e) {
            return false;
        }
    },

    isExtension: () => {
        try {
            if (window.chrome && chrome.runtime && chrome.runtime.id) { return true; }
            return false;
        } catch(e) {
            return false;
        }
    },

    // Merge two objects..
    merge: Object.assign,

    // Split a line but try not to cut a word in half..
    splitLine: (input, length) => {
        var lastSpace = input.substring(0, length).lastIndexOf(" ");
        // No spaces found, split at the very end to avoid a loop..
        if(lastSpace === -1) {
            lastSpace = length - 1;
        }
        return [input.substring(0, lastSpace), input.substring(lastSpace + 1)];
    },

    // Parse string to number. Returns NaN if string can't be parsed to number..
    toNumber: (num, precision) => {
        if (num === null) return 0;
        var factor = Math.pow(10, self.isFinite(precision) ? precision : 0);
        return Math.round(num * factor) / factor;
    },

    // Merge two arrays..
    union: (arr1, arr2) => {
        var hash = {};
        var ret = [];
        for(var i=0; i < arr1.length; i++) {
            var e = arr1[i];
            if (!hash[e]) {
                hash[e] = true;
                ret.push(e);
            }
        }
        for(var i=0; i < arr2.length; i++) {
            var e = arr2[i];
            if (!hash[e]) {
                hash[e] = true;
                ret.push(e);
            }
        }
        return ret;
    },

    // Return a valid username..
    username: (str) => {
        var username = (str ? str : "").toLowerCase();
        return username[0] === "#" ? username.slice(1) : username;
    }
}
