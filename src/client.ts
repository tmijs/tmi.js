import { EventEmitter, once } from 'events';
import * as tls from 'tls';
import * as tekko from 'tekko';

import {
	TekkoMessage,
	ClientOptions,
	Connection,
	UserOrClientUser,
	DisconnectEvent,
	GlobalUserStateEvent,
	JoinEvent,
	PartEvent,
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

const internalEvents = {
	JOIN: '_join'
};

/**
 * The tmi.js chat client.
 */
export interface Client {
	on(event: string, listener: Function): this;

	/**
	 * Received some unfiltered data from the TMI servers.
	 * TODO: REMOVE
	 */
	on(event: 'unhandled-command', listener: (data: MessageData) => void): this;

	/**
	 * An error occurred.
	 */
	on(event: 'error', listener: (error: Error) => void): this;

	/**
	 * Received a PING command from the TMI servers.
	 */
	on(event: 'ping', listener: () => void): this;

	/**
	 * Client connected to the TMI servers.
	 */
	on(event: 'connected', listener: () => void): this;

	/**
	 * Client disconnected from the TMI servers.
	 */
	on(event: 'disconnected', listener: (data: DisconnectEvent) => void): this;

	/**
	 * Client joined or another user joined a channel.
	 */
	on(event: 'join', listener: (data: JoinEvent) => void): this;

	/**
	 * Client parted or another user parted a channel.
	 */
	on(event: 'part', listener: (data: PartEvent) => void): this;

	/**
	 * Received a chat message.
	 */
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

	/**
	 * Received a NOTICE command
	 */
	on(event: 'notice', listener: (data: string) => void): this;

	emit(event: string, ...data: any);

	emit(event: 'error', error: Error);

	emit(event: 'ping');

	emit(event: 'connected');

	emit(event: 'disconnected', data: DisconnectEvent);

	emit(event: 'join', data: JoinEvent);

	emit(event: 'part', data: PartEvent);

	emit(event: 'globaluserstate', data: GlobalUserStateEvent);

	emit(event: 'roomstate', data: MessageData);

	emit(event: 'notice', data: string);
}

export class Client extends EventEmitter {
	/**
	 * The socket connection used by the client.
	 */
	socket: tls.TLSSocket | import('net').Socket;
	/**
	 * The IRC command handler.
	 */
	// ircCommandHandler: IRCCommandHandler;
	/**
	 * The original client options.
	 */
	options: ClientOptions;
	/**
	 * Details about the connection.
	 */
	connection: Connection;
	/**
	 * User of the authenticated user for the client
	 */
	user: ClientUser;
	/**
	 * List of joined channels.
	 */
	channels: Map<string, Channel>;

	/**
	 * @param {ClientOptions} opts Options for the CLient.
	 */
	constructor(opts: ClientOptions) {
		super();
		this.socket = null;
		// this.ircCommandHandler = new IRCCommandHandler(this);
		this.channels = new Map();
		this.options = opts;
		this.user = null;
		const {connection: connectionOpts = {}} = opts;
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
		let auth: string;
		if (typeof this.options.identity.auth === 'function') {
			let tempAuth = this.options.identity.auth(this);
			if (typeof tempAuth === 'string') {
				auth = tempAuth;
				triggerConnection.call(this);
			}
			else {
				tempAuth.then((value) => {
					auth = value;
					triggerConnection.call(this);
				}).catch((reason => {
					this.emit('error', {
						name: 'Connection error',
						message: reason
					});
				}))
			}
		} else {
			auth = this.options.identity.auth;
			triggerConnection.call(this);
		}

		function triggerConnection() {
			if (!auth.startsWith('oauth:')) {
				auth = 'oauth:' + auth;
			}

			this.sendRawArray([
				'CAP REQ :twitch.tv/tags twitch.tv/commands',
				`PASS ${auth}`,
				`NICK ${name}`
			]);
			// this.sendRaw('CAP REQ :twitch.tv/tags twitch.tv/commands');
			// this.sendRawArray([ 'PASS a', 'NICK justinfan1' ]);
			this.emit('connected');
		}
	}

	/**
	 * Connection to the TMI servers closed.
	 *
	 * @param hadError `true` if the socket had a transmission error.
	 */
	_onClose(hadError: boolean) {
		const willReconnect = false;
		this.emit('disconnected', {willReconnect, hadError});
		if (willReconnect) {
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
		if (data.length === 1) {
			this._handleMessage(data[0]);
		} else {
			for (const line of data) {
				this._handleMessage(line);
			}
		}
	}

	/**
	 * Handle a single line of the message data from the TMI connection in IRC
	 * format.
	 *
	 * @param raw IRC message from the TMI servers.
	 */
	_handleMessage(raw: string) {
		const parsedData = tekko.parse(raw) as TekkoMessage;
		parsedData.raw = raw;
		const {command} = parsedData;
		if (command === 'PING') {
			this.sendRaw('PONG :tmi.twitch.tv');
			this.emit('ping');
			return;
		} else if (parsedData.prefix && parsedData.prefix.user === 'jtv') {
			console.log('JTV');
			console.log(parsedData);
			return;
		} else if (command === '001') {
			const name = parsedData.params[0];
			if (!this.options.identity) {
				this.options.identity = {name, auth: null};
			} else {
				this.options.identity.name = name;
			}
			return;
		}
		// noop
		else if (noopIRCCommands.includes(command)) {
			return;
		}
		const data = new MessageData(this, parsedData);
		const {params, prefix, tags} = data;
		const [channelName] = params;
		let channel: Channel = null;
		if (channelName) {
			channel = this.channels.get(channelName);
			if (!channel) {
				channel = new Channel(this, channelName, tags);
			}
		}
		const isSelf = this.user && prefix.name === this.user.login;
		if (command === 'PRIVMSG') {
			const messageEvent = new ChatMessage(this, data);
			if (this.options.settings && this.options.settings.logToConsole) {
				console.log(`${messageEvent.channel.name} - ${messageEvent.user.displayName}: ${messageEvent.message}`);
			}
			this.emit('message', messageEvent);
		} else if (command === 'USERSTATE') {
			let state: UserState;
			if (this.user.states.has(channelName)) {
				state = this.user.states.get(channelName);
				state.update(tags);
			} else {
				tags.set('user-id', this.user.id);
				state = new UserState(tags, channel);
				this.user.states.set(channelName, state);
			}
			this.emit('userstate', {state});
		} else if (command === 'JOIN') {
			this.channels.set(channelName, channel);
			const eventData = {
				channel,
				user: this.user as UserOrClientUser
			};
			if (!isSelf) {
				eventData.user = new User(prefix.name, tags, channel);
			} else {
				this.emit(internalEvents.JOIN, null, eventData);
			}
			this.emit('join', eventData);
		} else if (command === 'PART') {
			const wasJoined = this.channels.delete(channelName);
			const hadState = this.user.states.delete(channelName);
			const eventData = {
				channel,
				user: this.user as UserOrClientUser
			};
			if (!channel) {
				eventData.channel = new Channel(this, channelName, tags);
			}
			if (!isSelf) {
				eventData.user = new User(prefix.name, tags, channel);
			}
			this.emit('part', eventData);
		} else if (command === 'ROOMSTATE') {
			this.emit('roomstate', data);
		} else if (command === 'GLOBALUSERSTATE') {
			let name = null;
			if (this.options.identity) {
				name = this.options.identity.name;
			}
			this.user = new ClientUser(this, name, tags);
			this.emit('globaluserstate', {user: this.user});
		} else if (command === 'NOTICE') {
			this.emit('notice', data.trailing);
		} else {
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
			if (err) {
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

	/**
	 * Connect to the TMI servers.
	 */
	connect(): Promise<any> {
		const {host, port} = this.connection;
		this.socket = tls.connect({host, port});
		const socket = this.socket;
		socket.setEncoding('utf8');
		socket.on('secureConnect', () => this._onConnect());
		socket.on('close', (hadError: boolean) => this._onClose(hadError));
		socket.on('error', (error: Error) => this._onError(error));
		socket.on('data', (data: string) => this._onData(data));

		// TODO:
		return Promise.resolve();
	}

	/**
	 * Send a chat message to a channel on Twitch.
	 *
	 * @param {string|Channel} channel Channel to send the message to.
	 * @param {string} message Message to send.
	 */
	say(channel: string | Channel, message: string) {
		if (typeof channel === 'string') {
			channel = new Channel(this, channel);
		}
		// this.sendRaw(`PRIVMSG ${channel} :${message}`);
		const ircMessage = tekko.format({
			command: 'PRIVMSG',
			middle: [channel.toString()],
			trailing: message
		});
		this.sendRaw(ircMessage);
	}

	/**
	 * Send a command to a channel on Twitch.
	 *
	 * @param {string|Channel} channel Channel to send the message to.
	 * @param {string} command Command to send.
	 * @param {string|[string]} params Params to send.
	 */
	sendCommand(
		channel: string | Channel,
		command: string,
		params: string | string[]
	) {
		const commandParams = Array.isArray(params) ? params.join(' ') : params;
		const ircMessage = tekko.format({
			command: 'PRIVMSG',
			middle: [channel.toString()],
			trailing: `/${command} ${commandParams}`
		});
		this.sendRaw(ircMessage);
	}

	/**
	 * Race an event listener against a timeout.
	 *
	 * @param {string} eventName The name of the event to listen to.
	 * @param {function(err:Error|String,eventData:*):boolean} validator A function to validate that the event data is tied to the
	 * input.
	 * @param {*} getErrorArgs Argument that the validator will pass in order to call
	 * the error.
	 */
	raceEvent(
		eventName: string,
		validator: (err: Error | string, eventData: any) => boolean,
		errorArg: any
	): Promise<any> {
		let listener, timeout;
		let isFulfilled = false;
		const createListener = (res, rej) => (err, eventData) => {
			const isValid = validator(err, eventData);
			if (isValid) {
				isFulfilled = true;
				clearTimeout(timeout);
				this.off(eventName, listener);
				!err ? res(eventData) : rej(err);
			}
		};
		return new Promise((res, rej) => {
			timeout = setTimeout(() => {
				if (!isFulfilled) {
					listener('Event timed out', errorArg);
				}
			}, 2000);
			listener = createListener(res, rej);
			this.on(eventName, listener);
		});
	}

	/**
	 * Join a room.
	 *
	 * @param {string|channel} channel The channel to join.
	 */
	join(channel: string | Channel): Promise<JoinEvent> {
		if (!this.user) {
			return once(this, 'globaluserstate')
				.then(() => this.join(channel));
		}
		const _channel = new DummyChannel(this, channel);
		const ircMessage = tekko.format({
			command: 'JOIN',
			middle: [_channel.toIRC()]
		});
		this.sendRaw(ircMessage);
		const validator = (err, eventData) => {
			const {user, channel} = eventData;
			const isChannel = channel.name === _channel.name;
			const errOrIsClient = err || user.isClientUser;
			return isChannel && errOrIsClient;
		};
		const errorArg = {channel: _channel, user: this.user};
		return this.raceEvent(internalEvents.JOIN, validator, errorArg)
			.catch(() => {
				throw 'Could not join channel: ' + _channel;
			});
	}

	/**
	 * Part a room.
	 *
	 * @param {string|Channel} channel The channel to part.
	 */
	part(channel: string | Channel): Promise<PartEvent> {
		if (!this.user) {
			return once(this, 'globaluserstate')
				.then(() => this.part(channel));
		}
		const _channel = new DummyChannel(this, channel);
		const ircMessage = tekko.format({
			command: 'PART',
			middle: [_channel.toIRC()]
		});
		this.sendRaw(ircMessage);
		const validator = (err, eventData) => {
			const {user, channel} = eventData;
			const isChannel = channel.name === _channel.name;
			const errOrIsClient = err || user.isClientUser;
			return isChannel && errOrIsClient;
		};
		const errorArg = {channel: _channel, user: this.user};
		return this.raceEvent('_part', validator, errorArg)
			.catch(() => {
				throw 'Could not part channel: ' + _channel;
			});
	}
}