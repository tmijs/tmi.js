# Upgrading from twitch-irc

This guide is intended to the developers who were using twitch-irc and are now upgrading to tmi.js. Please read this guide carefully. If you think something is missing, feel free to create an issue or send us a pull request to update the documentation. Remember to follow the [guidelines for contributing](https://github.com/Schmoopiie/tmi.js/blob/master/CONTRIBUTING.md).

### First steps
- Remove ``twitch-irc`` from ``node_modules`` and ``package.json``.
- Install tmi.js ``npm install tmi.js --save``.
- Change ``var irc = require("twitch-irc");`` to ``var irc = require("tmi.js");``

### Configuration
We have made some changes in the configuration, some features are deprecated by Twitch, such as ``TWITCHCLIENT``. Default for ``reconnect`` is now **false** and ``serverType`` has been changed to ``random``. See all the available options on the [configuration page](./Configuration.md).

### Events

- **CHAT** and **ACTION** events **are now triggered when the client sends a message using ``client.say()`` or ``client.action()``**, be careful. You will also be receiving exactly what Twitch sends you when you receive a message.

  - ``emote`` became ``emotes``.
  - Empty tag values are now returning ``null`` instead of ``true``.
  - ``1`` and ``0`` values are returned as booleans (``true`` and ``false``).
  - We transformed ``emotes`` to an object but the raw data is still available as ``emotes-raw``.
  - No more ``specials`` tag, use the new ``user-type`` by Twitch.

```javascript
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
```
- **ROOMSTATE** is fired upon joining a channel. Useful is you want to know if the channel is in subscribers-only mode or anything like that. We have modified it to include the channel name.

```javascript
client.on("roomstate", function(channel, state) {
    console.log(state);
});

// Returns:
{
    'broadcaster-lang': null,
    r9k: false,
    slow: false,
    'subs-only': false,
    channel: '#schmoopiie'
}
```
- **SLOWMODE** no longer returns the length in seconds. We are using the new NOTICE system by Twitch and it is still not perfect.
- **WHISPER** has been added as an event. First parameter is the username and seconds is the message. **You have to be connected on the group server to send and receive whispers.** Twitch is planning to move it to a new system, so it might break in the next weeks / months.
- **HOSTING** returns the channel name in lowercase and with a hashtag (#channel).

### Functions

- Use ``client.getUsername()`` to get the current username.
- Use ``client.getOptions()`` to get the current options.

### Utils

- Removed **utils.capitalize** because Twitch provides you with the display-name tag (only available if the user has changed his [Display name](http://www.twitch.tv/settings)).
- Use **utils.cronjobs** only in node.js and io.js, it cannot be used in the browser.

### Database

- Changed the database system a bit. Now using an updated version of LocallyDB and you can call it using ``client.nosql.``. You can change the path of the database using ``client.nosql.path("./db");``.

```javascript
client.nosql.path("./db");

client.nosql.insert('monsters', [
    {name: "sphinx", mythology: "greek", eyes: 2, sex: "f", hobbies: ["riddles","sitting","being a wonder"]},
    {name: "hydra", mythology: "greek", eyes: 18, sex: "m", hobbies: ["coiling","terrorizing","growing"]},
    {name: "huldra", mythology: "norse", eyes: 2, sex: "f", hobbies: ["luring","terrorizing"]},
    {name: "cyclops", mythology: "greek", eyes: 1, sex: "m", hobbies: ["staring","terrorizing"]},
    {name: "fenrir", mythology: "norse", eyes: 2, sex: "m", hobbies: ["growing","god-killing"]},
    {name: "medusa",  mythology: "greek", eyes: 2, sex: "f", hobbies: ["coiling","staring"]}
]).then(function() {
    console.log("Inserted data, now getting cid 3..");

    client.nosql.get('monsters', 3).then(function(data) {
        console.log(data);
    });
});
```

### Logger

We have made it compatible for the browser. There is no logging-to-file capabilities and we are not planning to re-add this feature.

### Commands

- Use ``client.whisper(username, message);`` to send a whisper. **You have to be connected on the group server to send and receive whispers.** Twitch is planning to move it to a new system, so it might break in the next weeks / months.

### Twitch API / OAuth 2.0

Not yet implemented, use the ``request`` module if you need to query the API. This is not a priority for us.
