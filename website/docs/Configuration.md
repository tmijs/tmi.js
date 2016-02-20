# Configuration

Each and every option listed below is optional. Running tmi.js without options will result as an anonymous connection to Twitch and you will have to join the channels manually.

``options``: (_Optional_)

- ``debug``: _Boolean_ - Show debug messages in console (Default: ``false``)

``connection``: (_Optional_)

- ``cluster``: _String_ - Server type (Default: ``"main"`` - Can be ``"main"``, ``"group"``, ``"event"`` or ``"aws"``)
- ``server``: _String_ - Connect to this server (_Do not set if you are using a random server from cluster_)
- ``port``: _Integer_ - Connect on this port (Default: ``80``)
- ``reconnect``: _Boolean_ - Reconnect to Twitch when disconnected from server (Default: ``false``)
- ``secure``: _Boolean_ - Use secure connection (SSL / HTTPS) (_Overrides port to ``443``_)
- ``timeout``: _Integer_ - Disconnect from server if not responding (Default: ``9999`` (ms))

``identity``: (_Optional_)

- ``username``: _String_ - Username on Twitch
- ``password``: _String_ - [OAuth password](http://twitchapps.com/tmi/) on Twitch

``channels``: _Array_ - List of channels to join when connected (Default: ``[]``)

``logger``: _Object_ - Custom logger with the methods ``info``, ``warn``, and ``error``

## Example

~~~ javascript
// Do NOT include this line if you are using the browser version.
var irc = require("tmi.js");

var options = {
    options: {
        debug: true
    },
    connection: {
        cluster: "chat",
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
