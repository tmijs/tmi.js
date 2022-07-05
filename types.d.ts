import Client from './lib/Client';
import EventEmitter from './lib/EventEmitter';
import Logger from './lib/Logger';

class EventEmitter {
	constructor();
	setMaxListeners(n: number): void;
	emit(eventType: string, ...args: any[]): boolean;
	emits(eventTypes: string[], values: any[][]): void;
	on(eventType: string, listener: Function): this;
	addListener(eventType: string, listener: Function): this;
	once(eventType: string, listener: Function): this;
	off(eventType: string, listener: Function): this;
	removeListener(eventType: string, listener: Function): this;
	removeAllListeners(eventType?: string): this;
	listeners(eventType: string): Function[];
	listenerCount(eventType: string): number;
}

interface OutgoingTags {
	'client-nonce': string;
	'reply-parent-msg-id': string;
}

type ChannelName = `#${string}`;

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

namespace Options {
	export interface Options {
		/**
		 * Automatically set the log level to "info", otherwise it's set to
		 * "error". Defaults to false.
		 * @default false
		 */
		debug: boolean;
		/**
		 * A channel name to use for the global userstate as well as the channel
		 * some commands will use when they don't need to target a particular
		 * one (e.g. color and whisper). Defaults to "#tmijs".
		 * @default "#tmijs"
		 */
		globalDefaultChannel: string;
		/**
		 * Enable to not add the "twitch.tv/membership" capability to the
		 * capabilities list when registering with Twitch. This disables the
		 * "JOIN" and "PART" event data for other users as Twitch won't send
		 * those commands. This can limit the data you receive to a minimum if
		 * you don't need it. Defaults to false.
		 * @default false
		 */
		skipMembership: boolean;
		/**
		 * Controls the rate at which the client will send the "JOIN" commands
		 * to join the channels list in milliseconds. Calling `join` at the same
		 * time can an issue with the Twitch rate limiting. The minimum value is
		 * 300.
		 * @default 2000
		 */
		joinInterval: number;
		/**
		 * Decide the log level for chat messages. Defaults to "info".
		 * @default "info"
		 */
		messagesLogLevel: LogLevel;
	}
	export interface Connection {
		/**
		 * The hostname of the Twitch IRC server.
		 * @default "irc-ws.chat.twitch.tv"
		 */
		server: string;
		/**
		 * The port of the Twitch IRC server. A value of 443 will imply that the
		 * secure option is set to true and vice versa.
		 * @default 443
		 */
		port: number;
		/**
		 * Whether to use a secure connection. A value of true will imply that
		 * the port is set to 443 and vice versa.
		 * @default true
		 */
		secure: boolean;
		/** */
		agent: http.Agent
		/**
		 * Should the client attempt to reconnect if the connection is lost.
		 * @default true
		 */
		reconnect: boolean;
		/**
		 * A multiplier for the amount of time to wait before attempting to
		 * reconnect.
		 * @default 1.5
		 */
		reconnectDecay: number;
		/**
		 * The base amount of time to wait before attempting to reconnect.
		 * @default 1000
		 */
		reconnectInterval: number;
		/**
		 * The maximum amount of time to wait before attempting to reconnect.
		 * @default 30000
		 */
		maxReconnectInterval: number;
		/**
		 * The maximum number of reconnect attempts before the client gives up.
		 * @default Infinity
		 */
		maxReconnectAttempts: number;
		/**
		 * The amount of time to wait before timing out a connection attempt.
		 * @default 9999
		 */
		timeout: number;
	}
	export interface Identity {
		/**
		 * The username of the client.
		 */
		username: string;
		/**
		 * The password of the client. Does not need to be prefixed with the
		 * "oauth:" prefix.
		 */
		password: string | Promise<string> | (() => string | Promise<string>);
	}
	export type Channels = string[];
}

interface ClientOptions {
	/**
	 * General options for the client.
	 */
	options?: Partial<Options.Options>;
	/**
	 * Options for the WebSocket connection.
	 */
	connection?: Partial<Options.Connection>;
	/**
	 * Options for the client's identity.
	 */
	identity?: Options.Identity;
	/**
	 * A list of channels to join upon connecting.
	 */
	channels?: Options.Channels;
}

interface BadgeInfo {
	subscriber?: string;
	[key: string]: string;
}

interface Badges {
	broadcaster?: string;
	moderator?: string;
	subscriber?: string;
	staff?: string;
	turbo?: string;
	[key: string]: string;
}

/**
 * @see https://dev.twitch.tv/docs/irc/tags/#globaluserstate-tags
 */
interface GlobalUserstate {
	'badge-info': BadgeInfo | null;
	badges: Badges | null;
	/**
	 * The client user's color in hexadecimal format.
	 */
	color: string;
	'display-name': string;
	/**
	 * A comma-separated list of emote sets the client user has access to. A
	 * list of emotes in each set can be obtained by [calling the Helix API.
	 * ](https://dev.twitch.tv/docs/api/reference#get-emote-sets)
	 */
	'emote-sets': string;
	'user-id': string;
	'user-type': 'admin' | 'global_mod' | 'staff' | null;
	'badge-info-raw': string | null;
	'badges-raw': string | null;
}

/**
 * @see https://dev.twitch.tv/docs/irc/tags#userstate-tags
 */
interface Userstate extends Omit<GlobalUserstate, 'user-id'> {
	mod: boolean;
	subscriber: boolean;
	username: string;
}

interface IRCMessage {
}

class ClientBase extends EventEmitter {
	/**
	 * The input options for the client.
	 */
	opts: ClientOptions;

	// Connection related

	maxReconnectAttempts: Options.Connection['maxReconnectAttempts'];
	maxReconnectInterval: Options.Connection['maxReconnectInterval'];
	reconnect: Options.Connection['reconnect'];
	reconnectDecay: Options.Connection['reconnectDecay'];
	reconnectInterval: Options.Connection['reconnectInterval'];
	/**
	 * Whether the client is currently waiting before calling `connect` to
	 * attempt to reconnect.
	 */
	reconnecting: boolean;
	/**
	 * The current number of reconnect attempts.
	 */
	reconnections: number;
	/**
	 * The current reconnect interval time in milliseconds.
	 */
	reconnectTimer: number;
	/**
	 * The current latency of the connection in seconds.
	 */
	currentLatency: number;
	latency: Date;
	pingLoop: ReturnType<typeof setInterval>;
	pingTimeout: ReturnType<typeof setTimeout>;
	secure: Options.Connection['secure'];
	server: Options.Connection['server'];
	port: Options.Connection['port'];
	/**
	 * Was `close` called on the client?
	 */
	wasCloseCalled: boolean;
	/**
	 * The reason for the disconnection.
	 */
	reason: string;
	/**
	 * The WebSocket connection to the Twitch IRC server.
	 */
	ws: WebSocket;

	// Chat related

	/**
	 * A comma-separated list of emote sets the client user has access to. A
	 * list of emotes in each set can be obtained by [calling the Helix API.
	 * ](https://dev.twitch.tv/docs/api/reference#get-emote-sets)
	 */
	emotes: string;
	/**
	 * A plain object with no properties. This object used to store the client's
	 * available emotes for parsing.
	 * @deprecated
	 */
	emotesets: {};
	/**
	 * The client's username.
	 */
	username: string;
	/**
	 * The list of channels the client is currently in (approximately) and will
	 * join upon connecting or reconnecting.
	 */
	channels: ChannelName[];
	/**
	 * @see https://dev.twitch.tv/docs/irc/tags/#globaluserstate-tags
	 */
	globaluserstate: GlobalUserstate;
	/**
	 * @see https://dev.twitch.tv/docs/irc/tags#userstate-tags
	 */
	userstate: { [key: ChannelName]: Userstate };
	/**
	 * @private
	 */
	lastJoined: ChannelName;
	moderators: { [key: ChannelName]: string[] };

	// Logger

	log: Logger;

	constructor(options: ClientOptions);

	/**
	 * Connect to the Twitch IRC server.
	 */
	connect(): Promise<[ typeof this.server, typeof this.port ]>;

	/**
	 *
	 */
	handleMessage(message: IRCMessage): void;
}

class Client extends ClientBase {

	/**
	 * Send action message (/me <message>) on a channel.
	 * @param channel The channel to send the message to.
	 * @param message The message to send.
	 * @param tags The tags to send with the message.
	 * @memberof Client
	 */
	action(channel: string, message: string, tags?: OutgoingTags): Promise<[ channel: ChannelName, message: string ]>;
	/**
	 * Ban username on channel.
	 * @param channel The channel to ban the user from.
	 * @param username The username to ban.
	 * @param reason The reason to ban the user with.
	 * @memberof Client
	 */
	ban(channel: string, username: string, reason?: string): Promise<[ channel: ChannelName, username: string, reason: string ]>;
	/**
	 * Clear all messages on a channel.
	 * @param channel The channel to clear.
	 * @memberof Client
	 */
	clear(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Change the color of the client's username.
	 * @param newColor  The color to change to.
	 * @memberof Client
	 */
	color(newColor: string): Promise<[ newColor: string ]>;
	/**
	 * Run commercial on a channel for X seconds.
	 * @param channel The channel to run the commercial on.
	 * @param seconds The length of the commercial in seconds. Default is 30.
	 * @memberof Client
	 */
	 commercial(channel: string, seconds?: 30 | 60 | 90 | 120 | 150 | 180): Promise<[ channel: ChannelName, seconds: number ]>;
	/**
	 * Delete a specific message on a channel.
	 * @param channel The channel to delete the message from.
	 * @param messageUUID The message UUID to delete.
	 * @memberof Client
	 */
	 deletemessage(channel: string, messageUUID: string): Promise<[ channel: ChannelName, messageUUID: string ]>;
	/**
	 * Enable emote-only mode on a channel.
	 * @param channel The channel to enable emote-only mode on.
	 * @memberof Client
	 */
	 emoteonly(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Disable emote-only mode on a channel.
	 * @param channel The channel to disable emote-only mode on.
	 * @memberof Client
	 */
	 emoteonlyoff(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Enable followers-only mode on a channel.
	 * @param channel The channel to enable followers-only mode on.
	 * @param minutes The number of minutes to set followers-only mode to.
	 * @memberof Client
	 */
	followersonly(channel: string, minutes: number): Promise<[ channel: ChannelName, minutes: number ]>;
	/**
	 * Disable followers-only mode on a channel.
	 * @param channel The channel to disable followers-only mode on.
	 * @memberof Client
	 */
	followersonlyoff(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Host a channel.
	 * @param channel The channel to send the host to.
	 * @param target The target channel to host.
	 * @memberof Client
	 */
	host(channel: string, target: string): Promise<[ channel: ChannelName, target: string, remainingHosts: number ]>;
	/**
	 * Join a channel.
	 * @param channel The channel to join.
	 * @memberof Client
	 */
	join(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Mod username on channel.
	 * @param channel The channel to mod the user on.
	 * @param username The username to mod.
	 * @memberof Client
	 */
	mod(channel: string, username: string): Promise<[ channel: ChannelName, username: string ]>;
	/**
	 * Get list of mods on a channel.
	 * @param channel The channel to get the mods of.
	 * @memberof Client
	 */
	mods(channel: string): Promise<string[]>;
	/**
	 * Leave a channel.
	 * @param channel The channel to leave.
	 * @memberof Client
	 */
	part(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Send a ping to the server.
	 * @memberof Client
	 */
	ping(): Promise<[ latencySeconds: number ]>
	/**
	 * Enable R9KBeta mode on a channel.
	 * @param channel The channel to enable R9KBeta mode on.
	 */
	r9kbeta(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Disable R9KBeta mode on a channel.
	 * @param channel The channel to disable R9KBeta mode on.
	 * @memberof Client
	 */
	r9kbetaoff(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Send a raw command to the server.
	 * @param command The command to send.
	 * @param tags The tags to send with the command.
	 * @memberof Client
	 */
	raw(command: string, tags?: OutgoingTags): Promise<[ command: string ]>;
	/**
	 * Send a message to a channel in reply to a message.
	 * @param channel The channel to send the message to.
	 * @param message The message to send.
	 * @param replyParentMsgId The message ID to reply to.
	 * @memberof Client
	 */
	reply(channel: string, message: string, replyParentMsgId: string): Promise<[ channel: ChannelName, message: string ]>;
	/**
	 * Send a message to a channel.
	 * @param channel The channel to send the message to.
	 * @param message The message to send.
	 * @param tags The tags to send with the message.
	 * @memberof Client
	 */
	say(channel: string, message: string, tags?: OutgoingTags): Promise<[ channel: ChannelName, message: string ]>;
	/**
	 * Enable slow mode on a channel.
	 * @param channel The channel to enable slow mode on.
	 * @param seconds The number of seconds to set slow mode to.
	 * @memberof Client
	 */
	slow(channel: string, seconds: number): Promise<[ channel: ChannelName, seconds: number ]>;
	/**
	 * Disable slow mode on a channel.
	 * @param channel The channel to disable slow mode on.
	 * @memberof Client
	 */
	slowoff(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Enable subscribers mode on a channel.
	 * @param channel The channel to enable subscribers mode on.
	 * @memberof Client
	 */
	subscribers(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Disable subscribers mode on a channel.
	 * @param channel The channel to disable subscribers mode on.
	 * @memberof Client
	 */
	subscribersoff(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Timeout username on channel for X seconds.
	 * @param channel The channel to timeout the user on.
	 * @param username The username to timeout.
	 * @param seconds The number of seconds to timeout the user for.
	 * @param reason The reason to timeout the user for.
	 * @memberof Client
	 */
	timeout(channel: string, username: string, seconds: number, reason?: string): Promise<[ channel: ChannelName, username: string, seconds: number, reason: string ]>;
	/**
	 * Unban username on channel.
	 * @param channel The channel to unban the user on.
	 * @param username The username to unban.
	 * @memberof Client
	 */
	unban(channel: string, username: string): Promise<[ channel: ChannelName, username: string ]>;
	/**
	 * Unhost a channel.
	 * @param channel The channel to send the unhost to.
	 * @memberof Client
	 */
	unhost(channel: string): Promise<[ channel: ChannelName ]>;
	/**
	 * Unmod username on channel.
	 * @param channel The channel to unmod the user on.
	 * @param username The username to unmod.
	 * @memberof Client
	 */
	unmod(channel: string, username: string): Promise<[ channel: ChannelName, username: string ]>;
	/**
	 * Remove username from VIP list on channel.
	 * @param channel The channel to remove the user from.
	 * @param username The username to remove.
	 * @memberof Client
	 */
	unvip(channel: string, username: string): Promise<[ channel: ChannelName, username: string ]>;
	/**
	 * Add username to VIP list on channel.
	 * @param channel The channel to add the user to.
	 * @param username The username to add.
	 * @memberof Client
	 */
	vip(channel: string, username: string): Promise<[ channel: ChannelName, username: string ]>;
	/**
	 * Get list of VIPs on a channel.
	 * @param channel The channel to get the VIPs of.
	 * @memberof Client
	 */
	vips(channel: string): Promise<string[]>;
	/**
	 * Send an whisper message to a user. Note, there are restrictions on who
	 * can send whispers (to combat malicious bots) and users may not receive
	 * whispers due to their individual account settings.
	 * @param username The username to send the whisper to.
	 * @param message The message to send.
	 * @memberof Client
	 */
	whisper(username: string, message: string): Promise<[ username: string, message: string ]>;
}

interface Client {
	followersmode: typeof Client.prototype.followersonly;
	followersmodeoff: typeof Client.prototype.followersonlyoff;
	leave: typeof Client.prototype.part;
	slowmode: typeof Client.prototype.slow;
	r9kmode: typeof Client.prototype.r9kbeta;
	uniquechat: typeof Client.prototype.r9kbeta;
	r9kmodeoff: typeof Client.prototype.r9kbetaoff;
	uniquechatoff: typeof Client.prototype.r9kbeta;
	slowmodeoff: typeof Client.prototype.slowoff;
}

// TODO: Events

export = { Client };