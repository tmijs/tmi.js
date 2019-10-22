# tmi.js - v2

![](https://i.imgur.com/r1N7y1c.png)

![npm](https://img.shields.io/npm/v/tmi.js?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/tmijs/tmi.js?style=flat-square)

## Usage

```ts
import * as tmi from 'tmi.js';

const client = new tmi.Client({
	identity: {
		name: 'my-bot-name',
		auth: 'oauth:my-bot-auth'
	}
});

client.connect();

client.on('connected', async () => {
	console.log('Connected');
	try {
		await client.join('alca');
	} catch(error) {
		console.error(error);
	}
});

client.on('join', ({ channel, user }) => {
	if(user.isClientUser) {
		// "Joined #alca"
		console.log(`Joined ${channel.name}`);
	}
});

client.on('message', ({ channel, message, user, reply, isClientUser }) => {
	// "[#alca] Alca: !hello"
	console.log(`[${channel.name}] ${user.displayName}: ${message}`);
	if(isClientUser) {
		return;
	}
	if(message.toLowerCase() === '!hello') {
		// "@alca, heya!""
		reply(`@${user.login}, heya!`);
	}
});
```

## Contribute

See the [guidelines](CONTRIBUTING.md).

```bash
git clone -b v2 --single-branch git@github.com:tmijs/tmi.js.git
npm install
npm run build
npm run test
```