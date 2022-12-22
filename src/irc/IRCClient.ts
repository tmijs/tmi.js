import Emittery from 'emittery';
import ManagedSocket from './ManagedSocket.js';
import { Command, CommandCLEARCHAT_Base, CommandPRIVMSG, CommandROOMSTATE, parseIrcLine } from './parse.js';
import type { IrcCommand } from './parse.js';

interface IrcClientEvents {
}

interface PingData {
	lastPing: number;
	pingLoop: ReturnType<typeof setInterval>;
	pingTimeout: ReturnType<typeof setTimeout>;
	setPingLoop(): void;
	setPingTimeout(): void;
}

class PingData {
	lastPing: number = -Infinity;
	pingLoop: ReturnType<typeof setInterval>;
	pingTimeout: ReturnType<typeof setTimeout>;
	constructor(public onPingLoop: () => void, public onPingTimeout: () => void) {
	}
	start() {
		this.setPingLoop();
	}
	stop() {
		clearInterval(this.pingLoop);
		this.clearPingTimeout();
	}
	setPingLoop() {
		this.pingLoop = setInterval(() => {
			this.setPingTimeout();
			this.onPingLoop();
		}, 1000 * 60 * 5);
	}
	setPingTimeout() {
		this.pingTimeout = setTimeout(this.onPingTimeout, 1000 * 10);
	}
	clearPingTimeout() {
		clearTimeout(this.pingTimeout);
	}
}

export default class IrcClient extends Emittery<IrcClientEvents> {
	socket: ManagedSocket;
	lastSentText: string;
	pingData: PingData;
	constructor() {
		super();
		this.socket = new ManagedSocket('wss://irc-ws.chat.twitch.tv:443');
		this.socket.on('open', () => this._onOpen());
		this.socket.on('message', data => this._onMessage(data));
		this.socket.on('error', error => this._onError(error));
		this.socket.on('close', () => this._onClose());
		this.pingData = new PingData(
			() => this.send('PING :tmijs-ping'),
			() => this.socket.disconnect(),
		);
	}
	_onOpen() {
		this.log('Socket opened');
		this.send('CAP REQ :twitch.tv/commands twitch.tv/tags');
		this.send(`PASS oauth:${process.env.TOKEN}`);
		this.send(`NICK ${process.env.NAME}`);
		// this.send('JOIN #alca,#electric_mermaid');
		this.pingData.start();
	}
	_onMessage(data: string) {
		if(typeof data !== 'string') {
			throw new Error('Expected string');
		}
		const lines = data.trim().split('\r\n');
		lines.forEach(line => this._onLine(line));
	}
	_onLine(line: string) {
		if(typeof line !== 'string') {
			throw new Error('Expected string');
		}
		try {
			const message = parseIrcLine(line);
			if(!message) {
				return;
			}
			this._onIrcMessage(message as IrcCommand);
		} catch(err) {
			this.log(err, line);
			return;
		}
	}
	_onIrcMessage(message: IrcCommand) {
		switch(message.command) {
			case 'PING': {
				this.send(`PONG :${message.params}`);
				break;
			}
			case 'PONG': {
				this.log('PONG received');
				this.log(message);
				break;
			}
			case 'CAP':
			case '001':
			case '002':
			case '003':
			case '004':
			case '375':
			case '372':
			case '353':
			case '366':
			case '376': {
				break;
			}
			case 'RECONNECT': {
				this.socket.reconnect();
				break;
			}
			case 'GLOBALUSERSTATE': {
				break;
			}
			case 'USERSTATE': {
				break;
			}
			case 'ROOMSTATE': {
				const command = new CommandROOMSTATE(message);
				command.log();
				// this.log(command);
				break;
			}
			case 'CLEARCHAT': {
				// {
				// 	raw: '@ban-duration=60;room-id=98125665;target-user-id=819112909;tmi-sent-ts=1661308443142 :tmi.twitch.tv CLEARCHAT #schlatt :voidmarcella18',
				// 	prefix: { nick: null, user: null, host: 'tmi.twitch.tv' },
				// 	command: 'CLEARCHAT',
				// 	channel: '#schlatt',
				// 	params: 'voidmarcella18',
				// 	tags: Map(4) {
				// 		'banDuration' => 60,
				// 		'roomId' => '98125665',
				// 		'targetUserId' => '819112909',
				// 		'tmiSentTs' => 1661308443142
				// 	}
				// 	}
				const command = CommandCLEARCHAT_Base.getClear(message);
				command.log();
				break;
			}
			case 'CLEARMSG': {
				this.log(message);
				this.log(`[${message.channel}] Clear message [${message.tags.targetMsgId}] from ${message.tags.login}: ${message.params}`);
				break;
			}
			case 'PRIVMSG': {
				const command = new CommandPRIVMSG(message);
				command.log();
				if('customRewardId' in message.tags) {
					this.log(`[${message.channel}] ${message.tags.displayName} redeemed id "${message.tags.customRewardId}": ${message.params}`);
				}
				else if('bits' in message.tags) {
					this.log(`[${message.channel}] ${message.tags.displayName} cheered ${message.tags.bits} bits`);
				}
				break;
			}
			case 'NOTICE': {
				console.log(`${message.tags.msgId}: '${message.params}';`);
				this.log(message);
				break;
			}
			case 'USERNOTICE': {
				this.log(message);
				// const command = new CommandUSERNOTICE(message);
				// command.log();
				break;
			}
			case 'JOIN': {
				this.log('Joined channel', message.channel);
				break;
			}
			// Deprecated feature: https://discuss.dev.twitch.tv/t/deprecation-of-the-twitch-membership-irc-capability/30352
			/** @ts-ignore */
			case 'HOSTTARGET': {
				break;
			}
			default: {
				this.log(message);
			}
		}
	}
	_onError(error: Error) {
		this.log(error);
	}
	_onClose() {
		this.log('Closed');
	}

	connect() {
		return this.socket.connect();
	}
	log(...args: any[]) {
		if(args[0] instanceof Command) {
			args[0].log();
		}
		else {
			console.log('[IRCClient]', ...args);
		}
	}

	send(data: string) {
		this.lastSentText = data;
		return this.socket.send(data);
	}
}