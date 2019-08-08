import { Client } from './client';
import { Tags } from './types';

export class Channel {
	client: Client;
	/** The originally formatted IRC room name for the channel. */
	name: string;
	/** The login name for the channel user. */
	login: string;
	/** The ID for the channel user. */
	id: string;
	/** The room UUID if it's a chat room. */
	roomUUID: string;
	/** Whether or not the room is a chat room. */
	isChatRoom: boolean;
	isDummy: boolean;

	constructor(client: Client, name: string, tags: Tags) {
		this.client = client;
		this.name = name;
		this.isDummy = false;
		if(name.startsWith('#chatrooms:') && name.includes(':', 11)) {
			// #chatrooms:<channel ID>:<room UUID>
			const [ , channelID, roomUUID ] = name.split(':');
			this.login = null;
			this.id = channelID;
			this.roomUUID = roomUUID;
			this.isChatRoom = true;
		}
		else {
			this.login = name.startsWith('#') ? name.slice(1) : name;
			this.id = tags.get('room-id');
			this.roomUUID = null;
			this.isChatRoom = false;
		}
	}
	/** Get or generate the IRC room name */
	toIRC() {
		if(this.name) {
			return this.name;
		}
		else if(this.isChatRoom) {
			return `#chatrooms:${this.id}:${this.roomUUID}`;
		}
		else {
			return `#${this.login}`;
		}
	}
	toString() {
		return this.toIRC();
	}
	/** Send a message to the channel. */
	say(message: string) {
		this.client.say(this.toIRC(), message);
	}
}

export class DummyChannel extends Channel {
	isDummy: true;

	constructor(client: Client, name: string, tags: Tags) {
		super(client, name, tags);
		this.isDummy = true;
	}
	say() {
		throw new Error('Cannot send chat to this dummy channel.');
	}
}