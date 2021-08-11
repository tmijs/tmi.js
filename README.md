# tmi.js

![Test Workflow Status](https://github.com/tmijs/tmi.js/workflows/Test/badge.svg)
[![Npm Version](https://img.shields.io/npm/v/tmi.js.svg?style=flat)](https://www.npmjs.org/package/tmi.js)
[![Downloads](https://img.shields.io/npm/dm/tmi.js.svg?style=flat)](https://www.npmjs.org/package/tmi.js)
[![Issues](https://img.shields.io/github/issues/tmijs/tmi.js.svg?style=flat)](https://github.com/tmijs/tmi.js/issues)
[![Node Version](https://img.shields.io/node/v/tmi.js.svg?style=flat)](https://www.npmjs.org/package/tmi.js)

![](https://i.imgur.com/r1N7y1c.png)

[Website](https://tmijs.com/) |
[Documentation currently at tmijs/docs](https://github.com/tmijs/docs/tree/gh-pages/_posts) |
[Changelog on the release page](https://github.com/tmijs/tmi.js/releases)

## Install

### Node

```bash
$ npm i tmi.js
```

```js
const tmi = require('tmi.js');
const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: 'bot_name',
		password: 'oauth:my_bot_token'
	},
	channels: [ 'my_channel' ]
});
client.connect().catch(console.error);
client.on('message', (channel, tags, message, self) => {
	if(self) return;
	if(message.toLowerCase() === '!hello') {
		client.say(channel, `@${tags.username}, heya!`);
	}
});
```

### Browser

Available as "`tmi`" on `window`.

```html
<script src="/scripts/tmi.min.js"></script>
```
```html
<script>
const client = new tmi.Client({ /* ... */ });
client.connect().catch(console.error);
</script>
```

#### Prebuilt Browser Releases

[Release page](https://github.com/tmijs/tmi.js/releases)

#### Build Yourself

```bash
$ git clone https://github.com/tmijs/tmi.js.git
$ npm install
$ npm run build
```

### Type Definitions

```bash
$ npm i -D @types/tmi.js
```

## Community

- Follow [@AlcaMagic on Twitter](https://twitter.com/AlcaMagic), [Alca on Twitch](https://twitch.tv/alca).
- Follow [@Schmoopiie on Twitter](https://twitter.com/Schmoopiie).
- Found a bug: [submit an issue.](https://github.com/tmijs/tmi.js/issues/new)
- Discussion and help about tmi.js: [Twitch API Discord Server](https://discord.gg/8NXaEyV)
- For everything else: [Official TwitchDev Discord Server](https://link.twitch.tv/devchat)

## Contributors

Thanks to all of the tmi.js [contributors](https://github.com/tmijs/tmi.js/graphs/contributors)!

## Contributing guidelines

Please review the [guidelines for contributing](https://github.com/tmijs/tmi.js/blob/master/CONTRIBUTING.md) of the [tmi.js repository](https://github.com/tmijs/tmi.js). We reserve the right to refuse a Pull Request if it does not meet the requirements.
