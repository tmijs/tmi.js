import * as tekko from 'tekko';

import { Client } from './client';
import { MessageTags, ChatMessageTags } from './tags';
import { Channel } from './channel';
import { User } from './user';
import { TekkoMessage } from './types';

/**
 * Parsed data from the message.
 */
export class MessageData {
	client: Client;
	/**
	 * The raw IRC string that was parsed.
	 */
	raw: string;
	/**
	 * The IRC command of the message.
	 */
	command: string;
	/**
	 * The tags that came with the message.
	 */
	tags: MessageTags;
	/**
	 * Text parameters from the message, like channel name.
	 */
	params: string[];
	/**
	 * Trailing parameters, like a user message.
	 */
	trailing: string;
	/**
	 * IRC message prefix, generally includes the user login.
	 */
	prefix: tekko.MessagePrefix;

	/**
	 * @param {Client} client A tmi.js Client instance.
	 * @param {TekkoMessage} data Parsed data for the message.
	 */
	constructor(client: Client, data: TekkoMessage) {
		this.client = client;
		this.raw = data.raw;
		this.command = data.command;
		this.tags = new MessageTags(data.tags);
		this.params = data.middle;
		this.trailing = data.trailing;
		this.prefix = data.prefix;
	}
}

/**
 * A chat message.
 */
export class ChatMessage {
	client: Client;
	/**
	 * Parse message data.
	 */
	messageData: MessageData;
	/**
	 * Channel that the message came from.
	 */
	channel: Channel;
	/**
	 * User that sent the message.
	 */
	user: User;
	/**
	 * Tags that came with the message.
	 */
	tags: ChatMessageTags;
	/**
	 * The message that the user sent.
	 */
	message: string;
	/**
	 * If the message is an "action" or colored message. (/me)
	 */
	isAction: boolean;
	/**
	 * If the message includes Bits.
	 */
	isCheer: boolean;

	/**
	 * If the message is a whisper
	 */
	isWhisper: boolean;

	/**
	 * @param {Client} client A tmi.js Client instance.
	 * @param {MessageData} data Parsed IRC data.
	 */
	constructor(client: Client, data: MessageData) {
		this.client = client;
		this.messageData = data;
		this.tags = data.tags;
		this.channel = new Channel(client, data.params[0], this.tags);
		const msg = data.trailing;
		this.message = msg;
		this.isAction = false;
		if(msg.startsWith('\u0001ACTION ') && msg.endsWith('\u0001')) {
			this.isAction = true;
			this.message = msg.slice(8, -1);
		}
		this.isCheer = this.tags.has('bits');
		this.isWhisper = data.command === 'WHISPER';
		this.user = new User(data.prefix.name, this.tags, this.channel);
	}

	/**
	 * Send a message back to the same channel that the chat message was sent
	 * from.
	 * @param {string} message
	 */
	reply(message: string) {
		if (this.isWhisper) {
			// TODO: Whisper
		}
		else {
			this.channel.say(message);
		}
	}
}