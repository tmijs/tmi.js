import { Client } from './client';
import { Tags } from './types';

/**
 * A channel room.
 */
export class Channel {
	client: Client;
	/**
	 * The originally formatted IRC room name for the channel.
	 */
	name: string;
	/**
	 * The login name for the channel user.
	 */
	login: string;
	/**
	 * The ID for the channel user.
	 */
	id: string;
	/**
	 * The room UUID if it's a chat room.
	 */
	roomUUID: string;
	/**
	 * The room is a chat room and not the main channel chat.
	 */
	isChatRoom: boolean;
	/**
	 * The room is a DummyChannel.
	 */
	isDummy: boolean;

	/**
	 * @param client A tmi.js Client instance.
	 * @param name The raw IRC channel name.
	 * @param tags Tags to be applied to the channel.
	 */
	constructor(client: Client, name: string | Channel, tags?: Tags) {
		this.client = client;
		if(name instanceof Channel) {
			name = name.name;
		}
		this.name = name;
		this.id = null;
		this.login = null;
		this.roomUUID = null;
		this.isDummy = false;
		if(name.startsWith('#chatrooms:') && name.includes(':', 11)) {
			// #chatrooms:<channel ID>:<room UUID>
			const [ , channelID, roomUUID ] = name.split(':');
			this.id = channelID;
			this.roomUUID = roomUUID;
			this.isChatRoom = true;
		}
		else {
			if(name.startsWith('#')) {
				this.login = name.slice(1);
			}
			else {
				this.login = name;
				this.name = '#' + name;
			}
			this.id = tags && tags.get('room-id');
			this.isChatRoom = false;
		}
	}
	/**
	 * Get or generate the IRC room name.
	 */
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
	/**
	 * Send a message to the channel.
	 */
	say(message: string) {
		this.client.say(this.toIRC(), message);
	}
}

/**
 * A fake channel that the user is not necessarily connected to. Just to
 * represent a channel for the user.
 */
export class DummyChannel extends Channel {
	isDummy: true;

	/**
	 * @param client A tmi.js Client instance.
	 * @param name The name of the dummy channel.
	 * @param tags The tags of the dummy channel.
	 */
	constructor(client: Client, name: string | Channel, tags?: Tags) {
		if(tags) {
			tags.set('room-id', tags.get('user-id'));
		}
		super(client, name, tags);
		this.isDummy = true;
	}
	/**
	 * Cannot send to a dummy channel.
	 */
	say() {
		throw new Error('Cannot send chat to this dummy channel.');
	}
}