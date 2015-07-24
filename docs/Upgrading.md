# Upgrading from twitch-irc

**Read this guide carefully.**

### First steps
- Remove ``twitch-irc`` from ``node_modules`` and ``package.json``.
- Install tmi.js ``npm install tmi.js --save``.
- Change ``var irc = require("twitch-irc");`` to ``var irc = require("tmi.js");``

### Configuration

- Changed default value for ``reconnect`` to ``false``.
- Changed ``serverType`` to ``random``.
- TwitchClient has been deprecated by Twitch.

### Events

- [**Chat**](./Events.html#chat) and [**Action**](./Events.html#action) events are now firing when the client sends a message.
- [**User object**](./Events.html#chat) now includes everything sent by Twitch when you receive a message.

  - Changed ``emote`` to ``emotes``.
  - Empty tag values are now returning ``null`` instead of ``true``.
  - Changed ``1`` and ``0`` values to booleans (``true`` and ``false``).
  - Transformed ``emotes`` to an object but the raw data is still available as ``emotes-raw``.
  - No more ``specials`` tag, use the new ``user-type`` by Twitch.

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

- [**ROOMSTATE**](./Events.html#roomstate) is fired upon joining a channel.

~~~ javascript
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
~~~

- [**SLOWMODE**](./Events.html#slowmode) no longer returns the length in seconds.
- [**WHISPER**](./Events.html#whisper) has been added as an event and command. **You have to be connected on the group server to send and receive whispers.** Twitch is planning to move it to a new system, so it might break in the next weeks / months.
- [**HOSTING**](./Events.html#hosting) is now returning the channel name in lowercase and with a hashtag (#channel).

### Functions

- Use ``client.getUsername()`` to get the current username.
- Use ``client.getOptions()`` to get the current options.

### Utils

- Removed **utils.capitalize**, use the ``display-name`` value from the user object.
- Use **utils.cronjobs** only in Node.js and io.js, it cannot be used in the browser.

### Database

- Changed ``client.db.`` to ``client.nosql.``. Change the path of the database using ``client.nosql.path("./db");``.

~~~ javascript
client.nosql.path("./db");

client.nosql.insert("monsters", [
    {name: "sphinx", mythology: "greek", eyes: 2, sex: "f", hobbies: ["riddles","sitting","being a wonder"]},
    {name: "hydra", mythology: "greek", eyes: 18, sex: "m", hobbies: ["coiling","terrorizing","growing"]},
    {name: "huldra", mythology: "norse", eyes: 2, sex: "f", hobbies: ["luring","terrorizing"]},
    {name: "cyclops", mythology: "greek", eyes: 1, sex: "m", hobbies: ["staring","terrorizing"]},
    {name: "fenrir", mythology: "norse", eyes: 2, sex: "m", hobbies: ["growing","god-killing"]},
    {name: "medusa",  mythology: "greek", eyes: 2, sex: "f", hobbies: ["coiling","staring"]}
]).then(function() {
    console.log("Inserted data, now getting cid 3..");

    client.nosql.get("monsters", 3).then(function(data) {
        console.log(data);
    });
});
~~~

### Logger

Now compatible for the browser. There is no logging-to-file capabilities and we are not planning to re-add this feature.

### Commands

- Use ``client.whisper(username, message);`` to [send a whisper](./Commands.html#whisper). **You have to be connected on the group server to send and receive whispers.** Twitch is planning to move it to a new system, so it might break in the next weeks / months.

### Twitch API / OAuth 2.0

Not yet implemented, use the ``request`` module if you need to query the API. This is **not a priority** for us.
