import * as tekko from 'tekko';

import { Client } from './client';
import { MessageTags, ChatMessageTags } from './tags';
import { Channel } from './channel';
import { User } from './user';

export class MessageData {
	client: Client;
	/** The raw IRC string that was parsed. */
	raw: string;
	/** The IRC command of the message. */
	command: string;
	/** The tags that came with the message. */
	tags: MessageTags;
	/**
	 * Text parameters from the message, like channel name and user messages.
	 */
	params: string[];
	/** Trailing parameters. */
	trailing: string;
	/** IRC message prefix, generally includes the user login. */
	prefix: tekko.MessagePrefix;

	constructor(client: Client, data: tekko.Message, raw: string) {
		this.client = client;
		this.raw = raw;
		this.command = data.command;
		this.tags = new MessageTags(data.tags);
		this.params = data.middle;
		this.trailing = data.trailing;
		this.prefix = data.prefix;
	}
}

/** A chat message. */
export class ChatMessage {
	client: Client;
	messageData: tekko.Message;
	raw: string;
	channel: Channel;
	user: User;
	tags: ChatMessageTags;
	message: string;

	/**
	 * 
	 * @param client A tmi.js Client instance.
	 * @param data Parsed IRC data.
	 * @param raw Raw IRC message.
	 */
	constructor(client: Client, data: tekko.Message, raw: string) {
		this.client = client;
		this.messageData = data;
		this.raw = raw;
		this.tags = new ChatMessageTags(data.tags);
		this.channel = new Channel(client, data.params[0], this.tags);
		this.message = data.params[1];
		const { name } = data.prefix;
		this.user = new User(name, this.tags, this.channel);
	}
	/**
	 * Send a message back to the same channel that the chat message was sent
	 * from.
	 */
	reply(message: string) {
		this.channel.say(message);
	}
}