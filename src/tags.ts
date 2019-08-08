import * as tekko from 'tekko';

import { EmoteIndexes } from './types';

const booleanMessageTags = [
	'mod', 'emote-only', 'r9k', 'rituals', 'subs-only',
	'msg-param-should-share-streak'
];

const numberMessageTags = [
	'ban-duration', 'bits', 'msg-param-cumulative-months', 'msg-param-months',
	'msg-param-promo-gift-total', 'msg-param-streak-months',
	'msg-param-viewerCount', 'msg-param-threshold'
];

/**
 * Twitch emotes within the message.
 */
export interface MessageEmotes {
	/**
	 * Get an emote's indexes in the message.
	 *
	 * @param emoteID ID of the emote.
	 * @returns An array of start and end objects for the indexes of the emotes
	 * in the message.
	 */
	get(emoteID: string): EmoteIndexes[];
}

export class MessageEmotes extends Map<string, EmoteIndexes[]> {
	/**
	 * The raw emotes tag value that was parsed.
	 */
	raw: string;

	/**
	 * @param raw The raw string for the emotes.
	 */
	constructor(raw: string = '') {
		super();
		this.raw = raw;
		if(!raw) {
			return;
		}
		const spl = raw.split('/');
		for(const item of spl) {
			const [ id, indices ] = item.split(':');
			const emotes = indices.split(',');
			const value: EmoteIndexes[] = [];
			for(const emote of emotes) {
				const [ start, end ] = emote.split('-');
				value.push({ start: +start, end: +end + 1 });
			}
			this.set(id, value);
		}
	}
}

/**
 * Tags for a message.
 */
export interface MessageTags {
	get(key: string): any;
	/**
	 * Badges that the user has set for display.
	 */
	get(key: 'badges'): Badges;
	/**
	 * Metadata related to some of the `badges`. For instance "subscriber" will
	 * be the exact amount of months the user has been subscribed to the channel
	 * if the "subscriber" badges exists on `badges`.
	 */
	get(key: 'badge-info'): BadgeInfo;
	/**
	 * HEX color code for username display. If an empty string, the color has
	 * not been set by the user, a random color from the default palette should
	 * be assigned for the duration of the session.
	 */
	get(key: 'color'): string;
	/**
	 * The user's display name is similar to their login name except that it can
	 * include capital letters and characters outside of ASCII. It can contain
	 * whitespace at the start or end.
	 */
	get(key: 'display-name'): string;
	/**
	 * The available emote sets sent TMI. Likely to give inaccurate results.
	 */
	get(key: 'emote-sets'): string;
	/**
	 * The ID of the user from the chat message.
	 */
	get(key: 'user-id'): string;
}

export class MessageTags extends Map<string, any> {
	/**
	 * @param data Parsed tag data for the message.
	 */
	constructor(data: tekko.MessageTags = {}) {
		super();
		for(const [ key, val ] of Object.entries(data)) {
			if(key === 'emotes') {
				if(typeof val === 'string') {
					this.set(key, new MessageEmotes(val));
				}
			}
			else if(key === 'badges') {
				if(typeof val === 'string') {
					this.set(key, new Badges(val));
				}
			}
			else if(key === 'badge-info') {
				if(typeof val === 'string') {
					this.set(key, new BadgeInfo(val));
				}
			}
			else if(key === 'followers-only') {
				let followersOnly: boolean | number = false;
				if(val === '-1') {
					followersOnly = false;
				}
				else if(val === '0') {
					followersOnly = true;
				}
				else if(typeof val === 'string') {
					followersOnly = parseInt(val);
				}
				this.set(key, followersOnly);
			}
			else if(key === 'slow') {
				let slow: boolean | number = false;
				if(val === '0') {
					slow = false;
				}
				else if(typeof val === 'string') {
					slow = parseInt(val);
				}
				this.set(key, slow);
			}
			else if(booleanMessageTags.includes(key)) {
				this.set(key, val === '1');
			}
			else if(numberMessageTags.includes(key)) {
				if(typeof val === 'string') {
					this.set(key, parseInt(val, 10));
				}
			}
			else if(
				key === 'subscriber' || key === 'turbo' || key === 'user-type'
			) {
				continue;
			}
			else {
				this.set(key, val);
			}
		}
	}
}

/**
 * Tags for a chat message.
 *
 * @see https://dev.twitch.tv/docs/irc/tags#privmsg-twitch-tags
 */
export interface ChatMessageTags {
	get(key: string): any;
	/**
	 * Badges that the user has set for display.
	 */
	get(key: 'badges'): Badges;
	/**
	 * Metadata related to some of the `badges`. For instance "subscriber" will
	 * be the exact amount of months the user has been subscribed to the channel
	 * if the "subscriber" badges exists on `badges`.
	 */
	get(key: 'badge-info'): BadgeInfo;
	/**
	 * HEX color code for username display. If an empty string, the color has
	 * not been set by the user, a random color from the default palette should
	 * be assigned for the duration of the session.
	 */
	get(key: 'color'): string;
	/**
	 * The user's display name is similar to their login name except that it can
	 * include capital letters and characters outside of ASCII. It can contain
	 * whitespace at the start or end.
	 */
	get(key: 'display-name'): string;
	/**
	 * TODO: WRITE THIS.
	 */
	get(key: 'emotes'): MessageEmotes | undefined;
	/**
	 * Unused?
	 */
	get(key: 'flags'): string;
	/**
	 * The UUID of the message.
	 */
	get(key: 'id'): string;
	/**
	 * True if the user is a chat moderator for the channel.
	 */
	get(key: 'mod'): boolean;
	/**
	 * The ID of the broadcaster of the channel.
	 */
	get(key: 'room-id'): string;
	/**
	 * A numeric timestamp that the message was sent at.
	 */
	get(key: 'tmi-sent-ts'): string;
	/**
	 * The ID of the user from the chat message.
	 */
	get(key: 'user-id'): string;
}

export class ChatMessageTags extends MessageTags {
	// constructor(data: tekko.MessageTags) {
	// 	super(data);
	// }
}

/**
 * A Map of chat badges.
 *
 * @see https://badges.twitch.tv/v1/badges/global/display
 * @see https://badges.twitch.tv/v1/badges/channels/:channelID/display
 */
export interface Badges {
	get(key: string): string;
	/**
	 * User is an anonymous user.
	 */
	get(key: 'anonymous-cheerer'): string;
	/**
	 * User has used Bits at some point.
	 */
	get(key: 'bits'): string;
	/**
	 * User participated in a Bits charity event.
	 */
	get(key: 'bits-charity'): string;
	/**
	 * User is a Bits leader on the leaderboard.
	 */
	get(key: 'bits-leader'): string;
	/**
	 * User is the broadcaster of the channel.
	 */
	get(key: 'broadcaster'): string;
	/**
	 * User received an award for being a good Clipper.
	 */
	get(key: 'clip-champ'): string;
	/**
	 * User is an extension instead of a human.
	 */
	get(key: 'extension'): string;
	/**
	 * User is a moderator of the channel.
	 */
	get(key: 'moderator'): string;
	/**
	 * User is a Twitch Partner.
	 */
	get(key: 'partner'): string;
	/**
	 * User has Twitch Prime.
	 */
	get(key: 'premium'): string;
	/**
	 * User is a Staff member of Twitch.
	 */
	get(key: 'staff'): string;
	/**
	 * User has gifted subs to the channel at some point.
	 */
	get(key: 'sub-gifter'): string;
	/**
	 * User is currently a subscriber of the channel.
	 */
	get(key: 'subscriber'): string;
	/**
	 * User has Twitch Turbo.
	 */
	get(key: 'turbo'): string;
	/**
	 * User is AutoMod instead of a human.
	 */
	get(key: 'twitchbot'): string;
	/**
	 * User is a VIP of the channel.
	 */
	get(key: 'vip'): string;

	has(key: string): boolean;
	/**
	 * User is an anonymous user.
	 */
	has(key: 'anonymous-cheerer'): boolean;
	/**
	 * User has used Bits at some point.
	 */
	has(key: 'bits'): boolean;
	/**
	 * User participated in a Bits charity event.
	 */
	has(key: 'bits-charity'): boolean;
	/**
	 * User is a Bits leader on the leaderboard.
	 */
	has(key: 'bits-leader'): boolean;
	/**
	 * User is the broadcaster of the channel.
	 */
	has(key: 'broadcaster'): boolean;
	/**
	 * User received an award for being a good Clipper.
	 */
	has(key: 'clip-champ'): boolean;
	/**
	 * User is an extension instead of a human.
	 */
	has(key: 'extension'): boolean;
	/**
	 * User is a moderator of the channel.
	 */
	has(key: 'moderator'): boolean;
	/**
	 * User is a Twitch Partner.
	 */
	has(key: 'partner'): boolean;
	/**
	 * User has Twitch Prime.
	 */
	has(key: 'premium'): boolean;
	/**
	 * User is a Staff member of Twitch.
	 */
	has(key: 'staff'): boolean;
	/**
	 * User has gifted subs to the channel at some point.
	 */
	has(key: 'sub-gifter'): boolean;
	/**
	 * User is currently a subscriber of the channel.
	 */
	has(key: 'subscriber'): boolean;
	/**
	 * User has Twitch Turbo.
	 */
	has(key: 'turbo'): boolean;
	/**
	 * User is AutoMod instead of a human.
	 */
	has(key: 'twitchbot'): boolean;
	/**
	 * User is a VIP of the channel.
	 */
	has(key: 'vip'): boolean;
}

export class Badges extends Map<string, string> {
	/**
	 * @param data The raw string for the badges.
	 */
	constructor(data: string) {
		super();
		if(!data) {
			return;
		}
		const badges = data.split(',');
		for(const item of badges) {
			const [ name, val ] = item.split('/');
			this.set(name, val);
		}
	}
}

/**
 * Metadata related to the chat badges in the badges tag.
 */
export interface BadgeInfo {
	get(key: string): string;
	/**
	 * Indicates the exact number of months the user has been a subscriber
	 */
	get(key: 'subscriber'): string;
}

export class BadgeInfo extends Badges {
}