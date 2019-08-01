import { ChatMessageTags, MessageTags } from "./tags";

/** The indexes of emotes in the message. */
export interface EmoteIndexes {
	start: number;
	end: number;
}

/** User options for the TMI connection. */
export interface ConnectionOptions {
	host?: string;
	port?: number;
	reconnect?: boolean;
}

/** Identity opions for the authenticated user. */
export interface IdentityOptions {
	name: string;
	auth: string | (() => string);
}

/** tmi.Client class instantiation options. */
export interface ClientOptions {
	connection?: ConnectionOptions;
	identity?: IdentityOptions;
}

/** Details about the connection */
export interface Connection extends ConnectionOptions {
}

export interface DisconnectEvent {
	willReconnect: boolean;
	hadError: boolean;
}

export type Tags = ChatMessageTags | MessageTags;