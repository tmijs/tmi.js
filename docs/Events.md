# Events

Some events will only be fired if you are logged in. If you are not familiar with event listeners, please [read this](https://nodejs.org/api/events.html).

## Contents

- [Action](./Events.html#action)
- [Chat](./Events.html#chat)
- [Clearchat](./Events.html#clearchat)
- [Connected](./Events.html#connected)
- [Connecting](./Events.html#connecting)
- [Disconnected](./Events.html#disconnected)
- [Hosted](./Events.html#hosted)
- [Hosting](./Events.html#hosting)
- [Join](./Events.html#join)
- [Logon](./Events.html#logon)
- [Mod](./Events.html#mod)
- [Mods](./Events.html#mods)
- [Notice](./Events.html#notice)
- [Part](./Events.html#part)
- [Ping](./Events.html#ping)
- [Pong](./Events.html#pong)
- [R9kbeta](./Events.html#r9kbeta)
- [Reconnect](./Events.html#reconnect)
- [Roomstate](./Events.html#roomstate)
- [Slowmode](./Events.html#slowmode)
- [Subanniversary](./Events.html#subanniversary)
- [Subscribers](./Events.html#subscribers)
- [Subscription](./Events.html#subscription)
- [Timeout](./Events.html#timeout)
- [Unhost](./Events.html#unhost)
- [Unmod](./Events.html#unmod)
- [Whisper](./Events.html#whisper)

## Action

Received action message on channel. (/me &lt;message&gt;)

Parameters:

- ``channel``: _String_ - Channel name
- ``user``: _Object_ - User object
- ``message``: _String_ - Message received
- ``self``: _Boolean_ - Message was sent by the client

~~~ javascript
client.on("action", function (channel, user, message, self) {
    // Do your stuff.
});
~~~

According to Twitch, the user object is always subject to change.

~~~ javascript
{
    color: '#FFFFFF',
    'display-name': 'Schmoopiie',
    emotes: { '25': [ '0-4' ] },
    subscriber: false,
    turbo: true,
    'user-type': 'mod',
    'emotes-raw': '25:0-4',
    username: 'schmoopiie'
}
~~~

## Chat

Received message on channel.

Parameters:

- ``channel``: _String_ - Channel name
- ``user``: _Object_ - User object
- ``message``: _String_ - Message received
- ``self``: _Boolean_ - Message was sent by the client

~~~ javascript
client.on("chat", function (channel, user, message, self) {
    // Do your stuff.
});
~~~

According to Twitch, the user object is always subject to change.

~~~ javascript
{
    color: '#FFFFFF',
    'display-name': 'Schmoopiie',
    emotes: { '25': [ '0-4' ] },
    subscriber: false,
    turbo: true,
    'user-type': 'mod',
    'emotes-raw': '25:0-4',
    username: 'schmoopiie'
}
~~~

## Clearchat

Chat of a channel got cleared.

Parameters:

- ``channel``: _String_ - Channel name

~~~ javascript
client.on("clearchat", function (channel) {
    // Do your stuff.
});
~~~

## Connected

Connected to server.

Parameters:

- ``address``: _String_ - Remote address
- ``port``: _Integer_ - Remote port

~~~ javascript
client.on("connected", function (address, port) {
    // Do your stuff.
});
~~~

## Connecting

Connecting to a server.

Parameters:

- ``address``: _String_ - Remote address
- ``port``: _Integer_ - Remote port

~~~ javascript
client.on("connecting", function (address, port) {
    // Do your stuff.
});
~~~

## Disconnected

Got disconnected from server.

Parameters:

- ``reason``: _String_ - Reason why you got disconnected

~~~ javascript
client.on("disconnected", function (reason) {
    // Do your stuff.
});
~~~

## Hosted

Channel is now hosted by another broadcaster. This event is fired only if you are logged in as the broadcaster.

Parameters:

- ``channel``: _String_ - Channel name being hosted
- ``username``: _String_ - Username hosting you
- ``viewers``: _Integer_ - Viewers count

~~~ javascript
client.on("hosted", function (channel, username, viewers) {
    // Do your stuff.
});
~~~

## Hosting

Channel is now hosting another channel.

Parameters:

- ``channel``: _String_ - Channel name that is now hosting
- ``target``: _String_ - Channel being hosted
- ``viewers``: _Integer_ - Viewers count

~~~ javascript
client.on("hosting", function (channel, target, viewers) {
    // Do your stuff.
});
~~~

## Join

Username has joined a channel. Not available on large channels and is also sent in batch every 30-60secs.

Parameters:

- ``channel``: _String_ - Channel name
- ``username``: _String_ - Username

~~~ javascript
client.on("join", function (channel, username) {
    // Do your stuff.
});
~~~

## Logon

Connection established, sending informations to server.

~~~ javascript
client.on("logon", function () {
    // Do your stuff.
});
~~~

## Mod

Someone got modded on a channel.

**Important**: It doesn't detect if ``username`` is a new moderator, it is triggered when jtv gives the moderator status to someone on a channel. You will see a lot of ``mod`` / ``unmod`` events on a channel. When a moderator joins a channel, it will take a few seconds for jtv to give him the moderator status. When leaving a channel, the user gets unmodded.

Parameters:

- ``channel``: _String_ - Channel name
- ``username``: _String_ - Username

~~~ javascript
client.on("mod", function (channel, username) {
    // Do your stuff.
});
~~~

## Mods

Received the list of moderators of a channel.

Parameters:

- ``channel``: _String_ - Channel name
- ``mods``: _Array_ - Moderators of the channel

~~~ javascript
client.on("mods", function (channel, mods) {
    // Do your stuff.
});
~~~

## Notice

Received a notice from server.

Parameters:

- ``channel``: _String_ - Channel name
- ``msgid``: _String_ - Message ID (See known IDs below)
- ``message``: _String_ - Message received

Known msg-ids:

- ``msg_banned``: You are permanently banned from talking in channel.
- ``whisper_invalid_self``: You cannot whisper to yourself.
- ``msg_subsonly``: This room is in subscribers only mode. To talk, purchase a channel subscription at [...]
- ``msg_duplicate``: Your message was not sent because you are sending messages too quickly.
- ``unrecognized_cmd``: Unrecognized command: [...]
- ``whisper_limit_per_sec``: You are sending whispers too fast. Try again in a second.
- ``whisper_limit_per_min``: You are sending whispers too fast. Try again in a minute.
- ``usage_color``: Usage: "/color <color>" - Change your username color. Color must be in hex (#000000) or one of the following: [...].
- ``color_changed``: Your color has been changed.
- ``no_permission``: You don't have permission to perform that action.

The following msg-ids wont be returned in the ``notice`` event because they are already available as event listeners:

- ``subs_on``: This room is now in subscribers-only mode.
- ``subs_off``: This room is no longer in subscribers-only mode.
- ``slow_on``: This room is now in slow mode. You may send messages every [...] seconds.
- ``slow_off``: This room is no longer in slow mode.
- ``r9k_on``: This room is now in r9k mode.
- ``r9k_off``: This room is no longer in r9k mode.
- ``host_on``: Now hosting [...]
- ``host_off``: Exited hosting mode.
- ``room_mods``: The moderators of this room are [...]
- ``no_mods``: There are no moderators for this room.

~~~ javascript
client.on("notice", function (channel, msgid, message) {
    // Do your stuff.
});
~~~

## Part

User has left a channel.

Parameters:

- ``channel``: _String_ - Channel name
- ``username``: _String_ - Username

~~~ javascript
client.on("part", function (channel, username) {
    // Do your stuff.
});
~~~

## Ping

Received PING from server.

~~~ javascript
client.on("ping", function () {
    // Do your stuff.
});
~~~

## Pong

Sent a PING request ? PONG.

Parameters:

- ``latency``: _Float_ - Current latency

~~~ javascript
client.on("pong", function (latency) {
    // Do your stuff.
});
~~~

## R9kbeta

Channel enabled or disabled R9K mode.

Parameters:

- ``channel``: _String_ - Channel name
- ``enabled``: _Boolean_ - Returns ``true`` if mode is enabled or ``false`` if disabled

~~~ javascript
client.on("r9kbeta", function (channel, enabled) {
    // Do your stuff.
});
~~~

## Reconnect

Trying to reconnect to server.

~~~ javascript
client.on("reconnect", function () {
    // Do your stuff.
});
~~~

## Roomstate

Triggered upon joining a channel. Gives you the current state of the channel.

Parameters:

- ``channel``: _String_ - Channel name
- ``state``: _Object_ - Current state of the channel

~~~ javascript
client.on("roomstate", function (channel, state) {
    // Do your stuff.
});
~~~

According to Twitch, the state object is always subject to change.

~~~ javascript
{
    'broadcaster-lang': null,
    r9k: false,
    slow: false,
    'subs-only': false,
    channel: '#schmoopiie'
}
~~~

## Slowmode

Channel enabled or disabled slow mode.

Parameters:

- ``channel``: _String_ - Channel name
- ``enabled``: _Boolean_ - Returns ``true`` if mode is enabled or ``false`` if disabled

~~~ javascript
client.on("slowmode", function (channel, enabled) {
    // Do your stuff.
});
~~~

## Subanniversary

Username has shared how many months he/she has been a subscriber on a channel.

Parameters:

- ``channel``: _String_ - Channel name
- ``username``: _String_ - Username
- ``months``: _Integer_ - How many months

~~~ javascript
client.on("subanniversary", function (channel, username, months) {
    // Do your stuff.
});
~~~

## Subscribers

Channel enabled or disabled subscribers-only mode.

Parameters:

- ``channel``: _String_ - Channel name
- ``enabled``: _Boolean_ - Returns ``true`` if mode is enabled or ``false`` if disabled

~~~ javascript
client.on("subscribers", function (channel, enabled) {
    // Do your stuff.
});
~~~

## Subscription

Username has subscribed to a channel.

Parameters:

- ``channel``: _String_ - Channel name
- ``username``: _String_ - Username

~~~ javascript
client.on("subscription", function (channel, username) {
    // Do your stuff.
});
~~~

## Timeout

Username has been timed out on a channel.

Parameters:

- ``channel``: _String_ - Channel name
- ``username``: _String_ - Username

~~~ javascript
client.on("timeout", function (channel, username) {
    // Do your stuff.
});
~~~

## Unhost

Channel ended the current hosting.

Parameters:

- ``channel``: _String_ - Channel name
- ``viewers``: _Integer_ - Viewer count

~~~ javascript
client.on("unhost", function (channel, viewers) {
    // Do your stuff.
});
~~~

## Unmod

Someone got unmodded on a channel.

**Important**: It doesn't detect if ``username`` got removed from moderators list. You will see a lot of ``mod`` / ``unmod`` events on a channel. When a moderator joins a channel, it will take a few seconds for jtv to give him the moderator status. When leaving a channel, the user gets unmodded.

Parameters:

- ``channel``: _String_ - Channel name
- ``username``: _String_ - Username

~~~ javascript
client.on("unmod", function (channel, username) {
    // Do your stuff.
});
~~~

## Whisper

Received a whisper.

**Important**: You have to be connected to a group chat server to send or receive whispers.

Parameters:

- ``username``: _String_ - Username
- ``message``: _String_ - Message

~~~ javascript
client.on("whisper", function (username, message) {
    // Do your stuff.
});
~~~
