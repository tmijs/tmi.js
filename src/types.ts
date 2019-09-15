import * as tekko from 'tekko';
import { Client } from './client';
import { ChatMessageTags, MessageTags } from "./tags";
import { Channel } from "./channel";
import { User, ClientUser, UserState } from "./user";

/**
 * Can either be the client user or another user.
 */
export type UserOrClientUser = User | ClientUser;

/**
 * Can either be generic message tags or a more specific type of tags like chat
 * message tags.
 */
export type Tags = MessageTags | ChatMessageTags;

/**
 * Tekko's message object with the raw IRC string added.
 */
export interface TekkoMessage extends tekko.Message {
	/**
	 * Raw IRC string that was parsed.
	 */
	raw: string;
}

/**
 * The indexes of emotes in the message.
 */
export interface EmoteIndex {
	/**
	 * The start index of the emote.
	 */
	start: number;
	/**
	 * The end index of the emote.
	 */
	end: number;
}

/**
 * User options for the TMI connection.
 */
export interface ConnectionOptions {
	/**
	 * The host name of the connection.
	 */
	host?: string;
	/**
	 * The port of the connection.
	 */
	port?: number;
	/**
	 * Will the client reconnect on disconnect.
	 */
	reconnect?: boolean;
}

/**
 * Identity opions for the authenticated user.
 */
export interface IdentityOptions {
	/**
	 * The name of the user.
	 */
	name: string;
	/**
	 * The authorization token of the user. Can be a function that will return a
	 * token or a function that will return a Promise that will resolve to a
	 * token.
	 */
	auth: string | ((client: Client) => string) | (() => Promise<string>);
}

/**
 * tmi.Client class instantiation options.
 */
export interface ClientOptions {
	/**
	 * Options for the connection that the client will create, send, and listen
	 * to.
	 */
	connection?: ConnectionOptions;
	/**
	 * Options for the identity of the user that the client will login as.
	 */
	identity: IdentityOptions;
}

/**
 * Details about the connection.
 */
export interface Connection extends ConnectionOptions {
}

/**
 * The client was disconnected from the TMI servers.
 */
export interface DisconnectEvent {
	/**
	 * The client will immediately, or after a back off, reconnect after the
	 * disconnect.
	 */
	willReconnect: boolean;
	/**
	 * An error occurred causing the client to disconnect.
	 */
	hadError: boolean;
}

/**
 * The client or a user joined a channel.
 */
export interface JoinEvent {
	/**
	 * The channel that the user joined.
	 */
	channel: Channel;
	/**
	 * A user or the client user that joined the channel.
	 */
	user: UserOrClientUser;
}

/**
 * The client or a user parted a channel.
 */
export interface PartEvent {
	/**
	 * The channel that the user joined.
	 */
	channel: Channel;
	/**
	 * A user or the client user that joined the channel.
	 */
	user: UserOrClientUser;
}

/**
 * Received a GLOBALUSERSTATE command.
 */
export interface GlobalUserStateEvent {
	/**
	 * The client user object.
	 */
	user: ClientUser;
}

/**
 * Received a USERSTATE command.
 */
export interface UserStateEvent {
	/**
	 * The user state that was created or updated with this event.
	 */
	state: UserState;
}