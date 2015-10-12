# Commands

Each and every actions support [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). Some commands requires you to be logged in.

## Contents

- [Action](./Commands.md#action)
- [Ban](./Commands.md#ban)
- [Clear](./Commands.md#clear)
- [Color](./Commands.md#color)
- [Commercial](./Commands.md#commercial)
- [Connect](./Commands.md#connect)
- [Disconnect](./Commands.md#disconnect)
- [Host](./Commands.md#host)
- [Join](./Commands.md#join)
- [Mod](./Commands.md#mod)
- [Mods](./Commands.md#mods)
- [Part](./Commands.md#part)
- [Ping](./Commands.md#ping)
- [R9kbeta](./Commands.md#r9kbeta)
- [R9kbetaoff](./Commands.md#r9kbetaoff)
- [Raw](./Commands.md#raw)
- [Say](./Commands.md#say)
- [Slow](./Commands.md#slow)
- [Slowoff](./Commands.md#slowoff)
- [Subscribers](./Commands.md#subscribers)
- [Subscribersoff](./Commands.md#subscribersoff)
- [Timeout](./Commands.md#timeout)
- [Unban](./Commands.md#unban)
- [Unhost](./Commands.md#unhost)
- [Unmod](./Commands.md#unmod)
- [Whisper](./Commands.md#whisper)

## Action

Send an action message on a channel. (/me &lt;message&gt;)

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``message``: _String_ - Message (Required)

~~~ javascript
client.action("channel", "Your message");
~~~

## Ban

Ban username on channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to ban (Required)

~~~ javascript
client.ban("channel", "username");
~~~

## Clear

Clear all messages on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.clear("channel");
~~~

## Color

Change the color of your username.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``color``: _String_ - Color name (Required)

**Note:** A channel must be specified for this command to work. Turbo users can change their color using hexadecimal color (like ``#000000`` or ``#FFFFFF``) and non-turbo users can choose one of the following colors:

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
client.color("channel", "#C0C0C0");
client.color("channel", "SpringGreen");
~~~

## Commercial

Run commercial on a channel for X seconds. Available lengths (seconds) are ``30``, ``60``, ``90``, ``120``, ``150``, ``180``.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``seconds``: _Integer_ - Commercial lengths (Required)

~~~ javascript
client.commercial("channel", 30);
~~~

## Connect

Connect to server.

~~~ javascript
client.connect();
~~~

## Disconnect

Disconnect from server.

~~~ javascript
client.disconnect();
~~~

## Host

Host a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``target``: _String_ - Channel to host (Required)

~~~ javascript
client.host("channel", "target");
~~~

## Join

Join a channel.

**Parameters:****

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.join("channel");
~~~

## Mod

Mod username on channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to add as a moderator (Required)

~~~ javascript
client.mod("channel", "username");
~~~

## Mods

Get list of mods on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
// Mods event listener required:
client.mods("channel");

// Using promises, no mods event listener required:
client.mods("channel").then(function(mods) {
    console.log(mods);
});
~~~

## Part

Leave a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.part("channel");
~~~

## Ping

Send a PING to the server.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.ping();
~~~

## R9kbeta

Enable R9KBeta on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.r9kbeta("channel");
~~~

## R9kbetaoff

Disable R9KBeta on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.r9kbetaoff("channel");
~~~

## Raw

Send a RAW message to the server.

**Parameters:**

- ``message``: _String_ - Message to send to the server (Required)

~~~ javascript
client.raw("CAP REQ :twitch.tv/tags");
~~~

## Say

Send a message on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``message``: _String_ - Message (Required)

~~~ javascript
client.say("channel", "Your message");
~~~

## Slow

Enable slow mode on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``length``: _Integer_ - Length in seconds (Optional, default is 300)

~~~ javascript
client.slow("channel", 300);
~~~

## Slowoff

Disable slow mode on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.slowoff("channel");
~~~

## Subscribers

Enable subscriber-only on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.subscribers("channel");
~~~

## Subscribersoff

Disable subscriber-only on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.subscribersoff("channel");
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

## Unban

Unban username on channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to unban (Required)

~~~ javascript
client.unban("channel", "username");
~~~

## Unhost

End the current hosting. You must be the broadcaster or an editor.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)

~~~ javascript
client.unhost("channel");
~~~

## Unmod

Unmod user on a channel.

**Parameters:**

- ``channel``: _String_ - Channel name (Required)
- ``username``: _String_ - Username to unmod (Required)

~~~javascript
client.unmod("channel", "username");
~~~

## Whisper

Send a message on a channel.

**Important:** You have to be connected to a group chat server to send or receive whispers.

**Parameters:**

- ``username``: _String_ - Username (Required)
- ``message``: _String_ - Message (Required)

~~~ javascript
client.whisper("username", "Your message");
~~~
