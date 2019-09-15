import * as tekko from 'tekko';

import {EmoteIndex} from './types';

const booleanMessageTags = ['mod', 'emote-only', 'r9k', 'rituals', 'subs-only', 'msg-param-should-share-streak'];

const numberMessageTags = ['ban-duration', 'bits', 'msg-param-cumulative-months', 'msg-param-months',
                           'msg-param-promo-gift-total', 'msg-param-streak-months', 'msg-param-viewerCount',
                           'msg-param-threshold'];

/**
 * Twitch emotes within the message.
 */
export interface MessageEmotes {
    /**
     * Get an emote's indexes in the message.
     *
     * @param {string} emoteID ID of the emote.
     * @returns {[EmoteIndex]} An array of start and end objects for the indexes of the emotes
     * in the message.
     */
    get(emoteID: string): EmoteIndex[];
}

export class MessageEmotes extends Map<string, EmoteIndex[]> {
    /**
     * The raw emotes tag value that was parsed.
     */
    raw: string;

    /**
     * @param {string=''} [raw] The raw string for the emotes.
     */
    constructor(raw: string = '') {
        super();
        this.raw = raw;
        if (!raw) {
            return;
        }
        const spl = raw.split('/');
        for (const item of spl) {
            const [id, indices] = item.split(':');
            const emotes = indices.split(',');
            const value: EmoteIndex[] = [];
            for (const emote of emotes) {
                const [start, end] = emote.split('-');
                value.push({start: +start, end: +end + 1});
            }
            this.set(id, value);
        }
    }
}

/**
 * Tags for a message.
 */
export interface MessageTags {
    /**
     * @param {string} key
     * @returns {*}
     */
    get(key: string): any;

    /**
     * Badges that the user has set for display.
     * @param {'badges'} key
     * @returns {Badges}
     */
    get(key: 'badges'): Badges;

    /**
     * Metadata related to some of the `badges`. For instance "subscriber" will
     * be the exact amount of months the user has been subscribed to the channel
     * if the "subscriber" badges exists on `badges`.
     * @param {'badge-info'} key
     * @returns {BadgeInfo}
     */
    get(key: 'badge-info'): BadgeInfo;

    /**
     * HEX color code for username display. If an empty string, the color has
     * not been set by the user, a random color from the default palette should
     * be assigned for the duration of the session.
     * @param {'color'} key
     * @returns {string}
     */
    get(key: 'color'): string;

    /**
     * The user's display name is similar to their login name except that it can
     * include capital letters and characters outside of ASCII. It can contain
     * whitespace at the start or end.
     * @param {'display-name'} key
     * @returns {string}
     */
    get(key: 'display-name'): string;

    /**
     * The available emote sets sent TMI. Likely to give inaccurate results.
     * @param {'emote-sets'} key
     * @returns {string}
     */
    get(key: 'emote-sets'): string;

    /**
     * The ID of the user from the chat message.
     * @param {'user-id'} key
     * @returns {string}
     */
    get(key: 'user-id'): string;
}

export class MessageTags extends Map<string, any> {
    /**
     * @param {tekko.MessageTags} data Parsed tag data for the message.
     */
    constructor(data: tekko.MessageTags = {}) {
        super();
        for (const [key, val] of Object.entries(data)) {
            if (key === 'emotes') {
                if (typeof val === 'string') {
                    this.set(key, new MessageEmotes(val));
                }
            } else if (key === 'badges') {
                if (typeof val === 'string') {
                    this.set(key, new Badges(val));
                }
            } else if (key === 'badge-info') {
                if (typeof val === 'string') {
                    this.set(key, new BadgeInfo(val));
                }
            } else if (key === 'followers-only') {
                let followersOnly: boolean | number = false;
                if (val !== '-1') {
                    if (val === '0') {
                        followersOnly = true;
                    } else if (typeof val === 'string') {
                        followersOnly = parseInt(val);
                    }
                }
                this.set(key, followersOnly);
            } else if (key === 'slow') {
                let slow: boolean | number = false;
                if (val !== '0') {
                    if (typeof val === 'string') {
                        slow = parseInt(val);
                    }
                }
                this.set(key, slow);
            } else if (booleanMessageTags.includes(key)) {
                this.set(key, val === '1');
            } else if (numberMessageTags.includes(key)) {
                if (typeof val === 'string') {
                    this.set(key, parseInt(val, 10));
                }
            } else if (key === 'subscriber' || key === 'turbo' || key === 'user-type') {
                continue;
            } else {
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
export interface ChatMessageTags extends MessageTags {
	/**
	 * @param {string} key
	 * @returns {*}
	 */
    get(key: string): any;

	/**
	 * Badges that the user has set for display.
	 * @param {'badges'} key
	 * @returns {Badges}
	 */
	get(key: 'badges'): Badges;

	/**
	 * Metadata related to some of the `badges`. For instance "subscriber" will
	 * be the exact amount of months the user has been subscribed to the channel
	 * if the "subscriber" badges exists on `badges`.
	 * @param {'badge-info'} key
	 * @returns BadgeInfo
	 */
	get(key: 'badge-info'): BadgeInfo;

	/**
	 * HEX color code for username display. If an empty string, the color has
	 * not been set by the user, a random color from the default palette should
	 * be assigned for the duration of the session.
	 * @param {'color'} key
	 * @returns {string}
	 */
	get(key: 'color'): string;

	/**
	 * The user's display name is similar to their login name except that it can
	 * include capital letters and characters outside of ASCII. It can contain
	 * whitespace at the start or end.
	 * @param {'display-name'} key
	 * @returns {string}
	 */
	get(key: 'display-name'): string;

	/**
	 * Twitch emotes used in the user's message. The ID of the emote is the key
	 * in the Map which contains an array of the indexes, start and end, of
	 * the emotes.
	 * @param {'emotes'} key
	 * @returns {MessageEmotes}
	 */
	get(key: 'emotes'): MessageEmotes;

	/**
	 * (TODO) Unused?
	 * @param {'flags'} key
	 * @returns {string}
	 */
	get(key: 'flags'): string;

	/**
	 * The UUID of the message.
	 * @param {'id'} key
	 * @returns {string}
	 */
	get(key: 'id'): string;

	/**
	 * True if the user is a chat moderator for the channel.
	 * @param {'mod'} key
	 * @returns {boolean}
	 */
	get(key: 'mod'): boolean;

	/**
	 * The ID of the broadcaster of the channel.
	 * @param {'room-id'} key
	 * @returns {string}
	 */
	get(key: 'room-id'): string;

	/**
	 * A numeric timestamp that the message was sent at.
	 * @param {'tmi-sent-ts'} key
	 * @returns {string}
	 */
	get(key: 'tmi-sent-ts'): string;

	/**
	 * The ID of the user from the chat message.
	 * @param {'user-id'} key
	 * @returns string
	 */
	get(key: 'user-id'): string;
}

/**
 * A Map of chat badges.
 *
 * @see https://badges.twitch.tv/v1/badges/global/display
 * @see https://badges.twitch.tv/v1/badges/channels/:channelID/display
 */
export interface Badges {
	/**
	 * @param {string} key
	 * @returns {string}
	 */
    get(key: string): string;

    /**
     * User is an anonymous user.
	 * @param {'anonymous-cheerer'} key
	 * @returns {string}
     */
    get(key: 'anonymous-cheerer'): string;

    /**
     * User has used Bits at some point.
	 * @param {'bits'} key
	 * @returns {string}
     */
    get(key: 'bits'): string;

    /**
     * User participated in a Bits charity event.
	 * @param {'bits-charity'} key
	 * @returns {string}
     */
    get(key: 'bits-charity'): string;

    /**
     * User is a Bits leader on the leaderboard.
	 * @param {'bits-leader'} key
	 * @returns {string}
     */
    get(key: 'bits-leader'): string;

    /**
     * User is the broadcaster of the channel.
	 * @param {'broadcaster'} key
	 * @returns {string}
     */
    get(key: 'broadcaster'): string;

    /**
     * User received an award for being a good Clipper.
	 * @param {'clip-champ'} key
	 * @returns {string}
     */
    get(key: 'clip-champ'): string;

    /**
     * User is an extension instead of a human.
	 * @param {'extension'} key
	 * @returns {string}
     */
    get(key: 'extension'): string;

    /**
     * User is a moderator of the channel.
	 * @param {'moderator'} key
	 * @returns {string}
     */
    get(key: 'moderator'): string;

    /**
     * User is a Twitch Partner.
	 * @param {'partner'} key
	 * @returns {string}
     */
    get(key: 'partner'): string;

    /**
     * User has Twitch Prime.
	 * @param {'premium'} key
	 * @returns {string}
     */
    get(key: 'premium'): string;

    /**
     * User is a Staff member of Twitch.
	 * @param {'staff'} key
	 * @returns {string}
     */
    get(key: 'staff'): string;

    /**
     * User has gifted subs to the channel at some point.
	 * @param {'sub-gifter'} key
	 * @returns {string}
     */
    get(key: 'sub-gifter'): string;

    /**
     * User is currently a subscriber of the channel.
	 * @param {'subscriber'} key
	 * @returns {string}
     */
    get(key: 'subscriber'): string;

    /**
     * User has Twitch Turbo.
	 * @param {'turbo'} key
	 * @returns {string}
     */
    get(key: 'turbo'): string;

    /**
     * User is AutoMod instead of a human.
	 * @param {'twitchbot'} key
	 * @returns {string}
     */
    get(key: 'twitchbot'): string;

    /**
     * User is a VIP of the channel.
	 * @param {'vip'} key
	 * @returns {string}
     */
    get(key: 'vip'): string;

	/**
	 * @param {string} key
	 * @returns {boolean}
	 */
	has(key: string): boolean;

    /**
     * User is an anonymous user.
	 * @param {'anonymous-cheerer'} key
	 * @returns {boolean}
     */
    has(key: 'anonymous-cheerer'): boolean;

    /**
     * User has used Bits at some point.
	 * @param {'bits'} key
	 * @returns {boolean}
     */
    has(key: 'bits'): boolean;

    /**
     * User participated in a Bits charity event.
	 * @param {'bits-charity'} key
	 * @returns {boolean}
     */
    has(key: 'bits-charity'): boolean;

    /**
     * User is a Bits leader on the leaderboard.
	 * @param {'bits-leader'} key
	 * @returns {boolean}
     */
    has(key: 'bits-leader'): boolean;

    /**
     * User is the broadcaster of the channel.
	 * @param {'broadcaster'} key
	 * @returns {boolean}
     */
    has(key: 'broadcaster'): boolean;

    /**
     * User received an award for being a good Clipper.
	 * @param {'clip-champ'} key
	 * @returns {boolean}
     */
    has(key: 'clip-champ'): boolean;

    /**
     * User is an extension instead of a human.
	 * @param {'extension'} key
	 * @returns {boolean}
     */
    has(key: 'extension'): boolean;

    /**
     * User is a moderator of the channel.
	 * @param {'moderator'} key
	 * @returns {boolean}
     */
    has(key: 'moderator'): boolean;

    /**
     * User is a Twitch Partner.
	 * @param {'partner'} key
	 * @returns {boolean}
     */
    has(key: 'partner'): boolean;

    /**
     * User has Twitch Prime.
	 * @param {'premium'} key
	 * @returns {boolean}
     */
    has(key: 'premium'): boolean;

    /**
     * User is a Staff member of Twitch.
	 * @param {'staff'} key
	 * @returns {boolean}
     */
    has(key: 'staff'): boolean;

    /**
     * User has gifted subs to the channel at some point.
	 * @param {'sub-gifter'} key
	 * @returns {boolean}
     */
    has(key: 'sub-gifter'): boolean;

    /**
     * User is currently a subscriber of the channel.
	 * @param {'subscriber'} key
	 * @returns {boolean}
     */
    has(key: 'subscriber'): boolean;

    /**
     * User has Twitch Turbo.
	 * @param {'turbo'} key
	 * @returns {boolean}
     */
    has(key: 'turbo'): boolean;

    /**
     * User is AutoMod instead of a human.
	 * @param {'twitchbot'} key
	 * @returns {boolean}
     */
    has(key: 'twitchbot'): boolean;

    /**
     * User is a VIP of the channel.
	 * @param {'vip'} key
	 * @returns {boolean}
     */
    has(key: 'vip'): boolean;
}

export class Badges extends Map<string, string> {
    /**
     * @param {string} data The raw string for the badges.
     */
    constructor(data: string) {
        super();
        if (!data) {
            return;
        }
        const badges = data.split(',');
        for (const item of badges) {
            const [name, val] = item.split('/');
            this.set(name, val);
        }
    }
}

/**
 * Metadata related to the chat badges in the badges tag.
 */
export interface BadgeInfo {
	/**
	 * @param {string} key
	 * @returns {string}
	 */
    get(key: string): string;

    /**
     * Indicates the exact number of months the user has been a subscriber
	 * @param {'subscriber'} key
	 * @returns {string}
     */
    get(key: 'subscriber'): string;
}

export class BadgeInfo extends Badges {
}