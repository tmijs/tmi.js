# Configuration

Each and every option listed below is optional. Running tmi.js without options will result as an anonymous connection to Twitch and you will have to join your channels manually.

``options``: (_Optional_)
- ``debug``: _Boolean_ - Show debug messages in the console. It is showing when an event is being triggered (Default: _false_)

``connection``: (_Optional_)
- ``random``: _String_ - Change the server type (Default: _"chat"_, Can be _"chat"_, _"group"_ or _"event"_)
- ``server``: _String_ - Connect to this server (_Optional_)
- ``port``: _Integer_ - Connect on this port (_Optional_)
- ``reconnect``: _Boolean_ - Reconnect to twitch when disconnected (Default: _false_)
- ``timeout``: _Integer_ - Disconnect from server if not responding (Default: _9999_ (ms))

``identity``: (_Optional_)
- ``username``: _String_ - Username on Twitch
- ``password``: _String_ - [OAuth password](http://twitchapps.com/tmi/) on Twitch

``channels``: _Array_ - List of channels to join when connected (Default: _[]_)

## Example

```javascript
var irc = require("tmi.js");

var options = {
    options: {
        debug: true
    },
    connection: {
        random: "chat",
        reconnect: true
    },
    identity: {
        username: "Schmoopiie",
        password: "oauth:a29b68aede41e25179a66c5978b21437"
    },
    channels: ["#schmoopiie"]
};

var client = new irc.client(options);

// Connect the client to the server..
client.connect();
```
