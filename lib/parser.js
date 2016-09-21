/*
    Copyright (c) 2013-2015, Fionn Kelleher All rights reserved.

    Redistribution and use in source and binary forms, with or without modification,
    are permitted provided that the following conditions are met:

        Redistributions of source code must retain the above copyright notice,
        this list of conditions and the following disclaimer.

        Redistributions in binary form must reproduce the above copyright notice,
        this list of conditions and the following disclaimer in the documentation and/or other materials
        provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
    ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
    WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
    IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
    INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
    OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
    WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
    ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
    OF SUCH DAMAGE.
*/
var _ = require("./utils");

module.exports = {
    // Parse Twitch badges..
    badges: function badges(tags) {
        if (_.isString(tags["badges"])) {
            var badges = {};
            var explode = tags["badges"].split(",");

            for (var i = 0; i < explode.length; i++) {
                var parts = explode[i].split("/");
                if (!parts[1]) return;
                badges[parts[0]] = parts[1];
            }

            tags["badges-raw"] = tags["badges"];
            tags["badges"] = badges;
        }
        if (_.isBoolean(tags["badges"])) { tags["badges-raw"] = null; }

        return tags;
    },

    // Parse Twitch emotes..
    emotes: function emotes(tags) {
        if (_.isString(tags["emotes"])) {
            var emoticons = tags["emotes"].split("/");
            var emotes = {};

            for (var i = 0; i < emoticons.length; i++) {
                var parts = emoticons[i].split(":");
                if (!parts[1]) return;
                emotes[parts[0]] = parts[1].split(",");
            }

            tags["emotes-raw"] = tags["emotes"];
            tags["emotes"] = emotes;
        }
        if (_.isBoolean(tags["emotes"])) { tags["emotes-raw"] = null; }

        return tags;
    },

    // Parse regex emotes..
    emoteRegex: function emoteRegex(msg, code, id, obj) {
        var space = /\S+/g;
        var regex = new RegExp("(\\b|^|\s)"+_.unescapeHtml(code)+"(\\b|$|\s)");
        var match;

        // Check if emote code matches using RegExp and push it to the object..
        while ((match = space.exec(msg)) !== null) {
            if (regex.test(match[0])) {
                obj[id] = obj[id] || [];
                obj[id].push([match.index, space.lastIndex - 1])
            }
        }
    },

    // Parse string emotes..
    emoteString: function emoteString(msg, code, id, obj) {
        var space = /\S+/g;
        var match;

        // Check if emote code matches and push it to the object..
        while ((match = space.exec(msg)) !== null) {
            if (match[0] === _.unescapeHtml(code)) {
                obj[id] = obj[id] || [];
                obj[id].push([match.index, space.lastIndex - 1]);
            }
        }
    },

    // Transform the emotes object to a string with the following format..
    // emote_id:first_index-last_index,another_first-another_last/another_emote_id:first_index-last_index
    transformEmotes: function transformEmotes(emotes) {
        var transformed = "";

        Object.keys(emotes).forEach((id) => {
            transformed = `${transformed+id}:`;
            emotes[id].forEach((index) => {
                transformed = `${transformed+index.join("-")},`;
            });
            transformed = `${transformed.slice(0,-1)}/`;
        });

        return transformed.slice(0,-1);
    },

    // Parse Twitch messages..
    msg: function msg(data) {
        var message = {
            raw: data,
            tags: {},
            prefix: null,
            command: null,
            params: []
        }

        // Position and nextspace are used by the parser as a reference..
        var position = 0;
        var nextspace = 0;

        // The first thing we check for is IRCv3.2 message tags.
        // http://ircv3.atheme.org/specification/message-tags-3.2
        if (data.charCodeAt(0) === 64) {
            var nextspace = data.indexOf(" ");

            // Malformed IRC message..
            if (nextspace === -1) {
                return null;
            }

            // Tags are split by a semi colon..
            var rawTags = data.slice(1, nextspace).split(";");

            for (var i = 0; i < rawTags.length; i++) {
                // Tags delimited by an equals sign are key=value tags.
                // If there's no equals, we assign the tag a value of true.
                var tag = rawTags[i];
                var pair = tag.split("=");
                message.tags[pair[0]] = tag.substring(tag.indexOf("=") + 1) || true;
            }

            position = nextspace + 1;
        }

        // Skip any trailing whitespace..
        while (data.charCodeAt(position) === 32) {
            position++;
        }

        // Extract the message's prefix if present. Prefixes are prepended with a colon..
        if (data.charCodeAt(position) === 58) {
            nextspace = data.indexOf(" ", position);

            // If there's nothing after the prefix, deem this message to be malformed.
            if (nextspace === -1) {
                return null;
            }

            message.prefix = data.slice(position + 1, nextspace);
            position = nextspace + 1;

            // Skip any trailing whitespace..
            while (data.charCodeAt(position) === 32) {
                position++;
            }
        }

        nextspace = data.indexOf(" ", position);

        // If there's no more whitespace left, extract everything from the
        // current position to the end of the string as the command..
        if (nextspace === -1) {
            if (data.length > position) {
                message.command = data.slice(position);
                return message;
            }

            return null;
        }

        // Else, the command is the current position up to the next space. After
        // that, we expect some parameters.
        message.command = data.slice(position, nextspace);

        position = nextspace + 1;

        // Skip any trailing whitespace..
        while (data.charCodeAt(position) === 32) {
            position++;
        }

        while (position < data.length) {
            nextspace = data.indexOf(" ", position);

            // If the character is a colon, we've got a trailing parameter.
            // At this point, there are no extra params, so we push everything
            // from after the colon to the end of the string, to the params array
            // and break out of the loop.
            if (data.charCodeAt(position) === 58) {
                message.params.push(data.slice(position + 1));
                break;
            }

            // If we still have some whitespace...
            if (nextspace !== -1) {
                // Push whatever's between the current position and the next
                // space to the params array.
                message.params.push(data.slice(position, nextspace));
                position = nextspace + 1;

                // Skip any trailing whitespace and continue looping.
                while (data.charCodeAt(position) === 32) {
                    position++;
                }

                continue;
            }

            // If we don't have any more whitespace and the param isn't trailing,
            // push everything remaining to the params array.
            if (nextspace === -1) {
                message.params.push(data.slice(position));
                break;
            }
        }

        return message;
    }
}
