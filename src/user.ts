import { Client } from './client';
import { Channel, DummyChannel } from './channel';
import { Badges, BadgeInfo, ChatMessageTags, MessageTags } from './tags';

/**
 * A chat user from a channel.
 */
export class User {
	client: Client;
	/**
	 * The login name of the user.
	 */
	login: string;
	/**
	 * The ID of the user.
	 */
	id: string;
	/**
	 * The channel that the user is from.
	 */
	channel: Channel;
	/**
	 * The user's display name is similar to their login name except that it can
	 * include capital letters and characters outside of ASCII. It can contain
	 * whitespace at the start or end.
	 */
	displayName: string;
	/**
	 * Badges that the user has set for display.
	 */
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

	/**
	 * @param login The login name for the user.
	 * @param tags The tags for the user.
	 * @param channel The channel from the originating message.
	 */
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
	/**
	 * Update the values of the user.
	 *
	 * @param tags Updated tags for the user.
	 */
	update(tags: ChatMessageTags) {
		const keyMapping = {
			'badge-info': 'badgeInfo',
			'display-name': 'displayName',
			'emote-sets': 'emoteSets',
			'user-id': 'id'
		};
		for(const [ key, val ] of tags.entries()) {
			const prop = keyMapping[key] || key;
			if(this.hasOwnProperty(prop)) {
				this[prop] = val;
			}
		}
	}
	/**
	 * Check that the user has the "broadcaster" badge.
	 */
	isBroadcaster(): boolean {
		return this.badges.has('broadcaster');
	}
	/**
	 * Check that the user has the "moderator" badge.
	 */
	isMod(): boolean {
		return this.badges.has('moderator');
	}
	/**
	 * Check that the user has the "subscriber" badge.
	 */
	isSub(): boolean {
		return this.badges.has('subscriber');
	}
	/**
	 * Check that the user has the "vip" badge.
	 */
	isVIP(): boolean {
		return this.badges.has('vip');
	}
	/**
	 * Get how long a user has been subscribed in months. Will be `0` if they
	 * have never subscribed, is not currently subscribed, or for some other
	 * reason the badge is not being displayed.
	 */
	monthsSubbed(): number {
		const subbed = this.badgeInfo.get('subscriber');
		if(!subbed) {
			return 0;
		}
		return parseInt(subbed, 10);
	}
}

/**
 * A state for the client user in a channel.
 */
export class UserState extends User {
	/**
	 * @param tags Tags for the user in the channel.
	 * @param channel Channel for the user state.
	 */
	constructor(tags: MessageTags, channel: Channel) {
		super(channel.client.user.login, tags, channel);
		this.isClientUser = true;
	}
}

/**
 * The user of the client.
 */
export class ClientUser extends User {
	/**
	 * A dummy channel.
	 */
	channel: DummyChannel;
	/**
	 * This user is the client user.
	 */
	isClientUser: true;
	/**
	 * The states for the client user by the respective channels.
	 */
	states: Map<string, UserState>;

	/**
	 * @param client A tmi.js Client instance.
	 * @param name The name of the client user.
	 * @param tags Tags for the user.
	 */
	constructor(client: Client, name: string, tags: MessageTags) {
		const channel = new DummyChannel(client, name, tags);
		super(name, tags, channel);
		this.isClientUser = true;
		this.states = new Map();
	}
}