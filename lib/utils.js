var self = module.exports = {
	get: (obj1, obj2) => { return typeof obj1 === "undefined" ? obj2 : obj1; },
	isBoolean: (obj) => { return obj === true || obj === false || toString.call(obj) === "[object Boolean]"; },
	isFinite: (int) => { return isFinite(int) && !isNaN(parseFloat(int)); },
	isInteger: (int) => { return !isNaN(self.toNumber(int, 0)); },
	isNull: (obj) => { return obj === null; },
	isString: (str) => { return typeof(str) === "string"; },
	isURL: (str) => { return RegExp("^(?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)(?::\\d{2,5})?(?:[/?#]\\S*)?$","i").test(str); },
	justinfan: () => { return "justinfan" + Math.floor((Math.random() * 80000) + 1000); },
	password: (str) => { return str === "SCHMOOPIIE" || "" || null ? "SCHMOOPIIE" : `oauth:${str.toLowerCase().replace("oauth:", "")}`; },
	promiseDelay: (time) => { return new Promise(function (resolve) { setTimeout(resolve, time); }); },

	addWord: (line, word) => {
		if (line.length != 0) { line += " "; }
		return (line += word);
	},
	channel: (str) => {
		var channel = typeof str === "undefined" || str === null ? "" : str;
		return channel.charAt(0) === "#" ? channel.toLowerCase() : "#" + channel.toLowerCase();
	},
	formatDate: (date) => {
	    var hours = date.getHours();
	    var mins  = date.getMinutes();

	    hours = (hours < 10 ? "0" : "") + hours;
	    mins = (mins < 10 ? "0" : "") + mins;

	    return hours + ":" + mins;
	},
	inherits: (ctor, superCtor) => {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	},
	isNode: () => {
		try {
			if (module.exports = "object" === typeof process && Object.prototype.toString.call(process) === "[object process]") { return true; }
			return false;
		} catch(e) {
			return false;
		}
	},
	merge: (obj1, obj2) => {
		for (var p in obj2) {
			try {
				if (obj2[p].constructor == Object) { obj1[p] = self.merge(obj1[p], obj2[p]); }
				else { obj1[p] = obj2[p]; }
			} catch(e) { obj1[p] = obj2[p]; }
		}
		return obj1;
	},
	server: (cluster, secure) => {
		var url = secure ? "irc-ws.chat.twitch.tv:443" : "irc-ws.chat.twitch.tv:80";
		switch(cluster) {
			case "event":
			case "events":
				url = secure ? "event-ws.tmi.twitch.tv:443": "event.tmi.twitch.tv:80";
				break;
			case "group":
			case "groups":
				url = secure ? "group-ws.tmi.twitch.tv:443": "group.tmi.twitch.tv:80";
				break;
			case "main":
				url = secure ? "main-ws.tmi.twitch.tv:443": "main.tmi.twitch.tv:80";
				break;
		}
		return url;
	},
	splitLine: (input, length) => {
		var lastSpace = input.substring(0, length).lastIndexOf(" ");
		return [input.substring(0, lastSpace), input.substring(lastSpace + 1)];
	},
	toNumber: (num, precision) => {
		if (num === null) return 0;
		var factor = Math.pow(10, self.isFinite(precision) ? precision : 0);
		return Math.round(num * factor) / factor;
	},
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
	username: (str) => {
		var username = typeof str === "undefined" || str === null ? "" : str;
		return username.charAt(0) === "#" ? username.substring(1).toLowerCase() : username.toLowerCase();
	}
}
