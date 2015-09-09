# Configuration

Each and every options listed below is optional. Running tmi.js without options will result as an anonymous connection to Twitch and you will have to join your channels manually.

``options``: (_Optional_)

- ``debug``: _Boolean_ - Show debug messages in the console. It is showing when an event is being triggered (Default: ``false``)

``connection``: (_Optional_)

- ``random``: _String_ - Change the server type (Default: ``"chat"``, Can be ``"chat"``, ``"group"`` or ``"event"``)
- ``server``: _String_ - Connect to this server (_Optional_)
- ``port``: _Integer_ - Connect on this port (_Optional_)
- ``reconnect``: _Boolean_ - Reconnect to twitch when disconnected (Default: ``false``)
- ``timeout``: _Integer_ - Disconnect from server if not responding (Default: ``9999`` (ms))

``identity``: (_Optional_)

- ``username``: _String_ - Username on Twitch
- ``password``: _String_ - [OAuth password](http://twitchapps.com/tmi/) on Twitch

``channels``: _Array_ - List of channels to join when connected (Default: ``[]``)

``logger``: _Object_ - Custom logger with the methods ``info``, ``warn``, and ``error``

## Example

~~~ javascript
var irc = require("tmi.js"); // Do not include this line if included in HTML page

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
~~~
