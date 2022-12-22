import IrcClient from './irc/index.js';

class Client {
	irc: IrcClient;
}

const client = new IrcClient();
client.connect();