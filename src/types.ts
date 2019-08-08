import { ChatMessageTags, MessageTags } from "./tags";
import { Channel } from "./channel";
import { User, ClientUser, UserState } from "./user";

export type UserOrClientUser = User | ClientUser;
export type Tags = ChatMessageTags | MessageTags;

/**
 * The indexes of emotes in the message.
 */
export interface EmoteIndexes {
	start: number;
	end: number;
}

/**
 * User options for the TMI connection.
 */
export interface ConnectionOptions {
	host?: string;
	port?: number;
	reconnect?: boolean;
}

/**
 * Identity opions for the authenticated user.
 */
export interface IdentityOptions {
	name: string;
	auth: string | (() => string);
}

/**
 * tmi.Client class instantiation options.
 */
export interface ClientOptions {
	connection?: ConnectionOptions;
	identity?: IdentityOptions;
}

/**
 * Details about the connection
 */
export interface Connection extends ConnectionOptions {
}

/**
 * The client was disconnected from the TMI servers.
 */
export interface DisconnectEvent {
	willReconnect: boolean;
	hadError: boolean;
}

/**
 * The client or a user joined a channel.
 */
export interface JoinEvent {
	channel: Channel;
	user: UserOrClientUser;
}

/**
 * The client or a user parted a channel.
 */
export interface PartEvent {
	channel: Channel;
	user: UserOrClientUser;
}

/**
 * Received a GLOBALUSERSTATE command.
 */
export interface GlobalUserStateEvent {
	user: ClientUser;
}

/**
 * Received a USERSTATE command.
 */
export interface UserStateEvent {
	state: UserState;
}