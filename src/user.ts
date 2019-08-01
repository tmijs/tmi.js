import { Client } from './client';
import { Channel } from './channel';
import { Badges, BadgeInfo, ChatMessageTags } from './tags';

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

	constructor(login: string, tags: ChatMessageTags, channel: Channel) {
		this.client = channel.client;
		this.login = login;
		this.id = tags.get('user-id');
		this.channel = channel;
		this.displayName = tags.get('display-name');
		this.badges = tags.get('badges');
		this.badgeInfo = tags.get('badge-info');
		this.color = tags.get('color');
	}
	/** Check that the user has the "broadcaster" badge. */
	isBroadcaster() {
		return this.badges.has('broadcaster');
	}
	/** Check that the user has the "moderator" badge. */
	isMod() {
		return this.badges.has('moderator');
	}
	/** Check that the user has the "subscriber" badge. */
	isSub() {
		return this.badges.has('subscriber');
	}
	/** Check that the user has the "vip" badge. */
	isVIP() {
		return this.badges.has('vip');
	}
	/**
	 * Get how long a user has been subscribed in months. 0 if never
	 * subscribed.
	 */
	monthsSubbed() {
		const subbed = this.badgeInfo.get('subscriber');
		if(!subbed) {
			return 0;
		}
		return parseInt(subbed, 10);
	}
}