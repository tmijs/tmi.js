import { Client } from './client';
import { Channel } from './channel';
import { Badges, BadgeInfo, ChatMessageTags, MessageTags } from './tags';

/** A chat user associated with a channel. */
export class User {
	client: Client;
	/** The login name of the user. */
	login: string;
	/** The ID of the user. */
	id: string;
	/** The channel that the user is associated with. */
	channel: Channel;
	/**
	 * The user's display name is similar to their login name except that it can
	 * include capital letters and characters outside of ASCII. It can contain
	 * whitespace at the start or end.
	 */
	displayName: string;
	/** Badges that the user has set for display. */
	badges: Badges;
	/**
	 * Metadata related to some of the `badges`. For instance "subscriber" will
	 * be the exact amount of months the user has been subscribed to the channel
	 * if the "subscriber" badges exists on `badges`.
	 */
	badgeInfo: BadgeInfo;
	/**
	 * HEX color code for username display. If an empty string, the color has
	 * not been set by the user, a random color from the default palette should
	 * be assigned for the duration of the session.
	 */
	color: string;
	/**
	 * Whether or not this user is the user object of the client instance.
	 */
	isClientUser: boolean;

	constructor(login: string, tags: ChatMessageTags, channel: Channel) {
		this.client = channel.client;
		this.login = login;
		this.id = tags.get('user-id');
		this.channel = channel;
		this.displayName = tags.get('display-name') || login;
		this.badges = tags.get('badges');
		this.badgeInfo = tags.get('badge-info');
		this.color = tags.get('color');
		this.isClientUser = false;
	}
	/** Check that the user has the "broadcaster" badge. */
	isBroadcaster(): boolean {
		return this.badges.has('broadcaster');
	}
	/** Check that the user has the "moderator" badge. */
	isMod(): boolean {
		return this.badges.has('moderator');
	}
	/** Check that the user has the "subscriber" badge. */
	isSub(): boolean {
		return this.badges.has('subscriber');
	}
	/** Check that the user has the "vip" badge. */
	isVIP(): boolean {
		return this.badges.has('vip');
	}
	/**
	 * Get how long a user has been subscribed in months. 0 if never
	 * subscribed.
	 */
	monthsSubbed(): number {
		const subbed = this.badgeInfo.get('subscriber');
		if(!subbed) {
			return 0;
		}
		return parseInt(subbed, 10);
	}
}

export class UserState extends User {
	constructor(tags: ChatMessageTags, channel: Channel) {
		super(channel.client.user.login, tags, channel);
		this.isClientUser = true;
	}
	update(tags: MessageTags) {
		// TODO
	}
}

export class ClientUser extends User {
	isClientUser: true;
	states: Map<string, UserState>;

	constructor(tags: ChatMessageTags, channel: Channel) {
		super(channel.client.user.login, tags, channel);
		this.isClientUser = true;
		this.states = new Map();
	}
}