# Commands

Each and every actions support [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). Some commands requires you to be logged in.

## Contents

- [Action](./Commands.md#action) - Send an action message on a channel. (/me &lt;message&gt;)
- [Ban](./Commands.md#ban) - Ban username on channel.
- [Clear](./Commands.md#clear) - Clear all messages on a channel.
- [Color](./Commands.md#color) - Change the color of your username.
- [Commercial](./Commands.md#commercial) - Run commercial on a channel for X seconds.
- [Connect](./Commands.md#connect) - Connect to server.
- [Disconnect](./Commands.md#disconnect) - Disconnect from server.
- [Emoteonly](./Commands.md#emoteonly) - Enable emote-only on a channel.
- [Emoteonlyoff](./Commands.md#emoteonlyoff) - Disable emote-only on a channel.
- [Host](./Commands.md#host) - Host a channel.
- [Join](./Commands.md#join) - Join a channel.
- [Mod](./Commands.md#mod) - Mod username on channel.
- [Mods](./Commands.md#mods) - Get list of mods on a channel.
- [Part](./Commands.md#part) - Leave a channel.
- [Ping](./Commands.md#ping) - Send a PING to the server.
- [R9kbeta](./Commands.md#r9kbeta) - Enable R9KBeta on a channel.
- [R9kbetaoff](./Commands.md#r9kbetaoff) - Disable R9KBeta on a channel.
- [Raw](./Commands.md#raw) - Send a RAW message to the server.
- [Say](./Commands.md#say) - Send a message on a channel.
- [Slow](./Commands.md#slow) - Enable slow mode on a channel.
- [Slowoff](./Commands.md#slowoff) - Disable slow mode on a channel.
- [Subscribers](./Commands.md#subscribers) - Enable subscriber-only on a channel.
- [Subscribersoff](./Commands.md#subscribersoff) - Disable subscriber-only on a channel.
- [Timeout](./Commands.md#timeout) - Timeout username on channel for X seconds.
- [Unban](./Commands.md#unban) - Unban username on channel.
- [Unhost](./Commands.md#unhost) - End the current hosting.
- [Unmod](./Commands.md#unmod) - Unmod user on a channel.
- [Whisper](./Commands.md#whisper) - Send an instant message to a user.

## Action

Send an action message on a channel. (/me &lt;message&gt;)

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``message``: _String_ - Message (Required)

~~~ javascript
client.action("channel", "Your message");
~~~

**Promises:**

- Resolved on message sent<sup>1</sup>
- Rejected on request timed out

1: There is no possible way to know if a message has been sent successfully unless we create two connections. This promise will **always** be resolved unless you are trying to send a message and you're not connected to server.

~~~ javascript
client.action("channel", "Your message").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Ban

Ban username on channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to ban (Required)

~~~ javascript
client.ban("channel", "username");
~~~

**Promises:**

- Resolved on [ban_success](./Events.md#notice)
- Rejected on [already_banned](./Events.md#notice), [bad_ban_admin](./Events.md#notice), [bad_ban_broadcaster](./Events.md#notice), [bad_ban_global_mod](./Events.md#notice), [bad_ban_self](./Events.md#notice), [bad_ban_staff](./Events.md#notice), [no_permission](./Events.md#notice), [usage_ban](./Events.md#notice) or request timed out

~~~ javascript
client.ban("channel", "username").then(function(data) {
    // data returns [channel, username]
}).catch(function(err) {
    //
});
~~~

## Clear

Clear all messages on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.clear("channel");
~~~

**Promises:**

- Resolved on [clearchat](./Events.md#clearchat) event
- Rejected on [no_permission](./Events.md#notice), [usage_clear](./Events.md#notice) or request timed out

~~~ javascript
client.clear("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Color

Change the color of your username.

**Parameters:**

- ``color``: _String_ - Color name (Required)

**Note:** Turbo users can change their color using hexadecimal color (like ``#000000`` or ``#FFFFFF``) and non-turbo users can choose one of the following colors:

- Blue
- BlueViolet
- CadetBlue
- Chocolate
- Coral
- DodgerBlue
- Firebrick
- GoldenRod
- Green
- HotPink
- OrangeRed
- Red
- SeaGreen
- SpringGreen
- YellowGreen

~~~ javascript
client.color("#C0C0C0");
client.color("SpringGreen");
~~~

**Promises:**

- Resolved on [color_changed](./Events.md#notice)
- Rejected on [turbo_only_color](./Events.md#notice), [usage_color](./Events.md#notice) or request timed out

~~~ javascript
client.color("#C0C0C0").then(function(data) {
    // data returns [color]
}).catch(function(err) {
    //
});
~~~

## Commercial

Run commercial on a channel for X seconds. Available lengths (seconds) are ``30``, ``60``, ``90``, ``120``, ``150``, ``180``.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``seconds``: _Integer_ - Commercial lengths (Required)

~~~ javascript
client.commercial("channel", 30);
~~~

**Promises:**

- Resolved on [commercial_success](./Events.md#notice)
- Rejected on [bad_commercial_error](./Events.md#notice), [no_permission](./Events.md#notice), [usage_commercial](./Events.md#notice) or request timed out

~~~ javascript
client.commercial("channel", 30).then(function(data) {
    // data returns [channel, seconds]
}).catch(function(err) {
    //
});
~~~

## Connect

Connect to server.

~~~ javascript
client.connect();
~~~

**Promises:**

- Resolved once connected to the server<sup>1</sup>
- Rejected if disconnected from server

1: Only fire once, will not fire upon reconnection.

~~~ javascript
client.connect().then(function(data) {
    // data returns [server, port]
}).catch(function(err) {
    //
});
~~~

## Disconnect

Disconnect from server.

~~~ javascript
client.disconnect();
~~~

**Promises:**

- Resolved when the socket is closed
- Rejected if socket is already closed

~~~ javascript
client.disconnect().then(function(data) {
    // data returns [server, port]
}).catch(function(err) {
    //
});
~~~

## Emoteonly

Enable emote-only on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.emoteonly("channel");
~~~

**Promises:**

- Resolved on [emote_only_on](./Events.md#notice)
- Rejected on [usage_emote_only_on](./Events.md#notice), [already_emote_only_on](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.emoteonly("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Emoteonlyoff

Disable emote-only on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.emoteonlyoff("channel");
~~~

**Promises:**

- Resolved on [emote_only_off](./Events.md#notice)
- Rejected on [usage_emote_only_off](./Events.md#notice), [already_emote_only_off](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.emoteonlyoff("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Host

Host a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``target``: _String_ - Channel to host (Required)

~~~ javascript
client.host("channel", "target");
~~~

**Promises:**

- Resolved on [hosts_remaining](./Events.md#notice)
- Rejected on [bad_host_hosting](./Events.md#notice), [bad_host_rate_exceeded](./Events.md#notice), [no_permission](./Events.md#notice), [usage_host](./Events.md#notice) or request timed out

~~~ javascript
client.host("channel", "target").then(function(data) {
    // data returns [channel, target]
}).catch(function(err) {
    //
});
~~~

## Join

Join a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.join("channel");
~~~

**Promises:**

- Resolved on [USERSTATE](https://github.com/justintv/Twitch-API/blob/master/IRC.md#userstate-1)
- Rejected on request timed out

~~~ javascript
client.join("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Mod

Mod username on channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to add as a moderator (Required)

~~~ javascript
client.mod("channel", "username");
~~~

**Promises:**

- Resolved on [mod_success](./Events.md#notice)
- Rejected on [usage_mod](./Events.md#notice), [bad_mod_banned](./Events.md#notice), [bad_mod_mod](./Events.md#notice) or request timed out

~~~ javascript
client.mod("channel", "username").then(function(data) {
    // data returns [channel, username]
}).catch(function(err) {
    //
});
~~~

## Mods

Get list of mods on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.mods("channel");
~~~

**Promises:**

- Resolved on [room_mods](./Events.md#notice) or [no_mods](./Events.md#notice)
- Rejected on [usage_mods](./Events.md#notice) or request timed out

~~~ javascript
client.mods("channel").then(function(data) {
    // data returns [moderators]
}).catch(function(err) {
    //
});
~~~

## Part

Leave a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.part("channel");
~~~

**Promises:**

- Resolved on leaving a channel
- Rejected on request timed out

~~~ javascript
client.part("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Ping

Send a PING to the server.

~~~ javascript
client.ping();
~~~

**Promises:**

- Resolved on [PONG](./Events.md#pong) received
- Rejected on request timed out

~~~ javascript
client.ping().then(function(data) {
    // data returns [latency]
}).catch(function(err) {
    //
});
~~~

## R9kbeta

Enable R9KBeta on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.r9kbeta("channel");
~~~

**Promises:**

- Resolved on [r9k_on](./Events.md#notice)
- Rejected on [usage_r9k_on](./Events.md#notice), [already_r9k_on](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.r9kbeta("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## R9kbetaoff

Disable R9KBeta on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.r9kbetaoff("channel");
~~~

**Promises:**

- Resolved on [r9k_off](./Events.md#notice)
- Rejected on [usage_r9k_off](./Events.md#notice), [already_r9k_off](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.r9kbetaoff("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Raw

Send a RAW message to the server.

**Parameters:**

- ``message``: _String_ - Message to send to the server (Required)

~~~ javascript
client.raw("CAP REQ :twitch.tv/tags");
~~~

**Promises:**

- Resolved on message sent
- Rejected on request timed out

~~~ javascript
client.raw("CAP REQ :twitch.tv/tags").then(function(data) {
    // data returns [message]
}).catch(function(err) {
    //
});
~~~

## Say

Send a message on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``message``: _String_ - Message (Required)

~~~ javascript
client.say("channel", "Your message");
~~~

**Promises:**

- Resolved on message sent<sup>1</sup>
- Rejected on request timed out

1: There is no possible way to know if a message has been sent successfully unless we create two connections. This promise will **always** be resolved unless you are trying to send a message and you're not connected to server.

~~~ javascript
client.say("channel", "Your message").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Slow

Enable slow mode on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``length``: _Integer_ - Length in seconds (Optional, default is 300)

~~~ javascript
client.slow("channel", 300);
~~~

**Promises:**

- Resolved on [ROOMSTATE](https://github.com/justintv/Twitch-API/blob/master/IRC.md#roomstate-1)
- Rejected on [usage_slow_on](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.slow("channel", 300).then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Slowoff

Disable slow mode on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.slowoff("channel");
~~~

**Promises:**

- Resolved on [ROOMSTATE](https://github.com/justintv/Twitch-API/blob/master/IRC.md#roomstate-1)
- Rejected on [usage_slow_off](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.slowoff("channel", 300).then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Subscribers

Enable subscriber-only on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.subscribers("channel");
~~~

**Promises:**

- Resolved on [subs_on](./Events.md#notice)
- Rejected on [usage_subs_on](./Events.md#notice), [already_subs_on](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.subscribers("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Subscribersoff

Disable subscriber-only on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.subscribersoff("channel");
~~~

**Promises:**

- Resolved on [subs_off](./Events.md#notice)
- Rejected on [usage_subs_off](./Events.md#notice), [already_subs_off](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.subscribersoff("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Timeout

Timeout username on channel for X seconds.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to timeout (Required)
- ``length``: _Integer_ - Length in seconds (Optional, default is 300)

~~~ javascript
client.timeout("channel", "username", 300);
~~~

**Promises:**

- Resolved on [timeout_success](./Events.md#notice)
- Rejected on [usage_timeout](./Events.md#notice), [bad_timeout_admin](./Events.md#notice), [bad_timeout_broadcaster](./Events.md#notice), [bad_timeout_global_mod](./Events.md#notice), [bad_timeout_self](./Events.md#notice), [bad_timeout_staff](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.timeout("channel", "username", 300).then(function(data) {
    // data returns [channel, username, seconds]
}).catch(function(err) {
    //
});
~~~

## Unban

Unban username on channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to unban (Required)

~~~ javascript
client.unban("channel", "username");
~~~

**Promises:**

- Resolved on [unban_success](./Events.md#notice)
- Rejected on [usage_unban](./Events.md#notice), [bad_unban_no_ban](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.unban("channel", "username").then(function(data) {
    // data returns [channel, username]
}).catch(function(err) {
    //
});
~~~

## Unhost

End the current hosting. You must be the broadcaster or an editor.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.unhost("channel");
~~~

**Promises:**

- Resolved on [HOSTTARGET](https://github.com/justintv/Twitch-API/blob/master/IRC.md#hosttarget)
- Rejected on [usage_unhost](./Events.md#notice), [not_hosting](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.unhost("channel").then(function(data) {
    // data returns [channel]
}).catch(function(err) {
    //
});
~~~

## Unmod

Unmod user on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to unmod (Required)

~~~javascript
client.unmod("channel", "username");
~~~

**Promises:**

- Resolved on [unmod_success](./Events.md#notice)
- Rejected on [usage_unmod](./Events.md#notice), [bad_unmod_mod](./Events.md#notice), [no_permission](./Events.md#notice) or request timed out

~~~ javascript
client.unmod("channel", "username").then(function(data) {
    // data returns [channel, username]
}).catch(function(err) {
    //
});
~~~

## Whisper

Send an instant message to a user.

**Important:** You have to be connected to a group chat server to send or receive whispers.

**Parameters:**

- ``username``: _String_ - Username (Required)
- ``message``: _String_ - Message (Required)

~~~ javascript
client.whisper("username", "Your message");
~~~

**Promises:**

- Resolved on message sent<sup>1</sup>
- Rejected on request timed out

1: There is no possible way to know if a message has been sent successfully unless we create two connections. This promise will **always** be resolved unless you are trying to send a message and you're not connected to server.

~~~ javascript
client.whisper("username", "Your message").then(function(data) {
    // data returns [username, message]
}).catch(function(err) {
    //
});
~~~
