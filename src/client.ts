import { EventEmitter } from 'events';
import * as tls from 'tls';
import * as tekko from 'tekko';

import {
	ClientOptions,
	UserOrClientUser,
	Connection,
	DisconnectEvent,
	JoinEvent,
	PartEvent,
	GlobalUserStateEvent,
	UserStateEvent
} from './types';
import { Channel, DummyChannel } from './channel';
import { MessageData, ChatMessage } from './message';
import { User, ClientUser, UserState } from './user';

const defaultTMIHost = 'irc.chat.twitch.tv';
const defaultTMIPort = 6697;

const noopIRCCommands = [
	'CAP', '002', '003', '004', '353', '366', '375', '372', '376'
];

export interface Client {
	on(event: string, listener: Function): this;
	/**
	 * Received some unfiltered data from the TMI servers.
	 * TODO: REMOVE
	 * */
	on(event: 'unhandled-command', listener: (data: MessageData) => void): this;
	/** An error occurred. */
	on(event: 'error', listener: (error: Error) => void): this;
	/** Received a PING from the TMI servers. */
	on(event: 'ping', listener: () => void): this;
	/** Client connected to the TMI servers. */
	on(event: 'connected', listener: () => void): this;
	/** Client disconnected from the TMI servers. */
	on(event: 'disconnected', listener: (data: DisconnectEvent) => void): this;
	/** Client joined or another user joined a channel. */
	on(event: 'join', listener: (data: JoinEvent) => void): this;
	/** Client parted or another user parted a channel. */
	on(event: 'part', listener: (data: PartEvent) => void): this;
	/** Received a chat message. */
	on(event: 'message', listener: (data: ChatMessage) => void): this;
	/**
	 * Received a GLOBALUSERSTATE command.
	 */
	on(
		event: 'globaluserstate',
		listener: (data: GlobalUserStateEvent) => void
	): this;
	/**
	 * Received a USERSTATE command.
	 */
	on(
		event: 'userstate',
		listener: (data: UserStateEvent) => void
	): this;
	/**
	 * Received a ROOMSTATE command.
	 */
	on(event: 'roomstate', listener: (data: MessageData) => void): this;

	emit(event: string, data?: any);
	emit(event: 'error', error: Error);
	emit(event: 'ping');
	emit(event: 'connected');
	emit(event: 'disconnected', data: DisconnectEvent);
	emit(event: 'join', data: JoinEvent);
	emit(event: 'part', data: PartEvent);
	emit(event: 'globaluserstate', data: GlobalUserStateEvent);
	emit(event: 'roomstate', data: MessageData);
}

/**
 * The tmi.js chat client.
 */
export class Client extends EventEmitter {
	/** The socket connection used by the client. */
	socket: tls.TLSSocket | import('net').Socket;
	/** The IRC command handler. */
	// ircCommandHandler: IRCCommandHandler;
	/** The original client options. */
	options: ClientOptions;
	/** Details about the connection. */
	connection: Connection;
	/** User of the authenticated user for the client */
	user: ClientUser;
	channels: Map<string, Channel>;

	constructor(opts: ClientOptions = {}) {
		super();
		this.socket = null;
		// this.ircCommandHandler = new IRCCommandHandler(this);
		this.channels = new Map();
		this.options = opts || {};
		this.user = null;
		const { connection: connectionOpts = {} } = opts;
		this.connection = {
			host: connectionOpts.host === undefined ? defaultTMIHost :
				connectionOpts.host,
			port: connectionOpts.port === undefined ? defaultTMIPort :
				connectionOpts.port
		};
	}
	/**
	 * Connected to the TMI servers, send the capability requests and login
	 * information.
	 */
	_onConnect() {
		const name = this.options.identity.name;
		const auth = `oauth:${this.options.identity.auth}`;
		this.sendRawArray([
			'CAP REQ :twitch.tv/tags twitch.tv/commands',
			`PASS ${auth}`,
			`NICK ${name}`
		]);
		// this.sendRaw('CAP REQ :twitch.tv/tags twitch.tv/commands');
		// this.sendRawArray([ 'PASS a', 'NICK justinfan1' ]);
		this.emit('connected');
	}
	/**
	 * Connection to the TMI servers closed.
	 * 
	 * @param hadError `true` if the socket had a transmission error.
	 */
	_onClose(hadError: boolean) {
		const willReconnect = false;
		this.emit('disconnected', { willReconnect, hadError });
		if(willReconnect) {
			this.connect();
		}
	}
	/**
	 * Emitted when an error occurs with the connection. The 'close' event will
	 * be called directly following this event.
	 * 
	 * @param error The error.
	 */
	_onError(error: Error) {
		this.emit('error', error);
	}
	/**
	 * Receieved data on the connection to the TMI servers.
	 * 
	 * @param rawData The data from the connection.
	 */
	_onData(rawData: string) {
		const data = rawData.trim().split('\r\n');
		if(data.length === 1) {
			this._handleMessage(data[0]);
		}
		else {
			for(const line of data) {
				this._handleMessage(line);
			}
		}
	}
	/**
	 * Handle a single line of the message data from the TMI connection in IRC
	 * format.
	 * 
	 * @param message IRC message from the TMI servers.
	 */
	_handleMessage(message: string) {
		const parsedData = tekko.parse(message);
		const { command } = parsedData;
		if(command === 'PING') {
			this.sendRaw('PONG :tmi.twitch.tv');
			this.emit('ping');
			return;
		}
		else if(parsedData.prefix && parsedData.prefix.user === 'jtv') {
			console.log('JTV');
			console.log(parsedData);
			return;
		}
		else if(command === '001') {
			const name = parsedData.params[0];
			if(!this.options.identity) {
				this.options.identity = { name, auth: null };
			}
			else {
				this.options.identity.name = name;
			}
			return;
		}
		// noop
		else if(noopIRCCommands.includes(command)) {
			return;
		}
		const data = new MessageData(this, parsedData, message);
		const { params, prefix, tags } = data;
		const [ channelName ] = params;
		let channel: Channel = null;
		if(channelName) {
			channel = this.channels.get(channelName);
			if(!channel) {
				channel = new Channel(this, channelName, tags);
			}
		}
		const isSelf = this.user && prefix.name === this.user.login;
		if(command === 'PRIVMSG') {
			const data = new ChatMessage(this, parsedData, message);
			this.emit('message', data);
		}
		else if(command === 'JOIN') {
			this.channels.set(channelName, channel);
			let user = this.user as UserOrClientUser;
			if(!isSelf) {
				user = new User(prefix.name, tags, channel);
			}
			this.emit('join', { channel, user });
		}
		else if(command === 'PART') {
			const wasJoined = this.channels.delete(channelName);
			const hadState = this.user.states.delete(channelName);
			if(!channel) {
				channel = new Channel(this, channelName, tags);
			}
			let user = this.user as UserOrClientUser;
			if(!isSelf) {
				user = new User(prefix.name, tags, channel);
			}
			this.emit('part', { channel, user });
		}
		else if(command === 'GLOBALUSERSTATE') {
			let name = null;
			if(this.options.identity) {
				name = this.options.identity.name;
			}
			const channel = new DummyChannel(this, name, tags);
			this.user = new ClientUser(tags, channel);
			this.emit('globaluserstate', { user: this.user });
		}
		else if(command === 'USERSTATE') {
			let state: UserState;
			if(this.user.states.has(channelName)) {
				state = this.user.states.get(channelName);
				state.update(tags);
			}
			else {
				state = new UserState(tags, channel);
				this.user.states.set(channelName, state);
			}
			this.emit('userstate', { state });
		}
		else if(command === 'ROOMSTATE') {
			this.emit('roomstate', data);
		}
		else {
			this.emit('unhandled-command', data);
		}
	}
	/**
	 * Send a raw IRC message to the TMI servers.
	 * 
	 * @param message Raw IRC message to append with CRLF.
	 */
	sendRaw(message: string) {
		this.socket.write(message + '\r\n', err => {
			if(err) {
				this.emit('error', err);
			}
		});
	}
	/**
	 * Send multiple raw IRC messages to the TMI servers.
	 * 
	 * @param messages List of messages to join with CRLF and send.
	 */
	sendRawArray(messages: string[]) {
		return this.sendRaw(messages.join('\r\n'));
	}
	/** Connect to the TMI servers. */
	connect(): Promise<any> {
		const { host, port } = this.connection;
		this.socket = tls.connect({ host, port });
		const socket = this.socket;
		socket.setEncoding('utf8');
		socket.on('secureConnect', () => this._onConnect());
		socket.on('close', (hadError: boolean) => this._onClose(hadError));
		socket.on('error', (error: Error) => this._onError(error));
		socket.on('data', (data: string) => this._onData(data));

		// TODO:
		return Promise.resolve();
	}
	getChannel(name: string | Channel | User): Channel {
		if(name instanceof User) {
			name = name.login;
		}
		else if(name instanceof Channel) {
			return name;
		}
		if(!name) {
			return null;
		}
		const channel = this.channels.find(chan => chan.login);
		if(channel) {
			return channel;
		}
		return null;
	}
	/**
	 * Send a chat message to a channel on Twitch.
	 * 
	 * @param channel Channel to send the message to.
	 * @param message Message to send.
	 */
	say(channel: string | Channel, message: string) {
		// this.sendRaw(`PRIVMSG ${channel} :${message}`);
		const ircMessage = tekko.format({
			command: 'PRIVMSG',
			params: [ channel.toString(), message ]
		});
		this.sendRaw(ircMessage);
	}
}

// export class IRCCommandHandler {
// 	client: Client;

// 	constructor(client: Client) {
// 		this.client = client;
// 	}
// 	emit(event: string, ...args: any[]): boolean {
// 		return this.client.emit(event, ...args);
// 	}
// 	CAP(data: MessageData) {
// 	}
// 	'001'(data: MessageData) {
// 	}
// 	'002'(data: MessageData) {
// 	}
// 	'003'(data: MessageData) {
// 	}
// 	'004'(data: MessageData) {
// 	}
// 	353(data: MessageData) {
// 	}
// 	366(data: MessageData) {
// 	}
// 	372(data: MessageData) {
// 	}
// 	375(data: MessageData) {
// 	}
// 	376(data: MessageData) {
// 	}
// 	PRIVMSG() {
// 	}
// }