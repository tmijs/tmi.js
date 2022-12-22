import { IrcMessage } from './parse.js';

export type EmoteIndices = [ number, number ][];
export type EmotesTag = Map<string, EmoteIndices>;

export interface MessageFlag {
	index: [ number, number ];
	/**
	 * Flags:
	 * - `A`: Aggressive Content
	 * - `I`: Identity-Based Hate
	 * - `P`: Profane Content
	 * - `S`: Sexual Content
	 */
	flags: Record<'A' | 'I' | 'P' | 'S', number>;
	text: string;
}

export type ParseTagFunc = (badge: string, message: IrcMessage<any>) => any;

export type ParseTagFuncNameList =
	| 'string'
	| 'number'
	| 'boolean'
	| 'booleanNumber'
	| 'badges'
	| 'emotes'
	| 'followersOnly'
	| 'slow'
	| 'flags'
	| 'threadId';

export const enum EParseTagFuncName {
	STRING = 'string',
	NUMBER = 'number',
	BOOLEAN = 'boolean',
	BOOLEAN_NUMBER = 'booleanNumber',
	BADGES = 'badges',
	EMOTES = 'emotes',
	FOLLOWERS_ONLY = 'followersOnly',
	SLOW = 'slow',
	FLAGS = 'flags',
	THREAD_ID = 'threadId',
}

export const _parseTagsMap: Record<string, [ string, ParseTagFuncNameList ]> = {
	'badge-info':
		[ 'badgeInfo', EParseTagFuncName.BADGES ],
	'badges':
		[ 'badges', EParseTagFuncName.BADGES ],
	'ban-duration':
		[ 'banDuration', EParseTagFuncName.NUMBER ],
	'bits':
		[ 'bits', EParseTagFuncName.NUMBER ],
	'client-nonce':
		[ 'clientNonce', EParseTagFuncName.STRING ],
	'color':
		[ 'color', EParseTagFuncName.STRING ],
	'custom-reward-id':
		[ 'customRewardId', EParseTagFuncName.STRING ],
	'display-name':
		[ 'displayName', EParseTagFuncName.STRING ],
	'emote-only':
		[ 'emoteOnly', EParseTagFuncName.BOOLEAN_NUMBER ],
	'emote-sets':
		[ 'emoteSets', EParseTagFuncName.STRING ],
	'emotes':
		[ 'emotes', EParseTagFuncName.EMOTES ],
	'first-msg':
		[ 'firstMsg', EParseTagFuncName.BOOLEAN_NUMBER ],
	'flags':
		[ 'flags', EParseTagFuncName.FLAGS ],
	'followers-only':
		[ 'followersOnly', EParseTagFuncName.FOLLOWERS_ONLY ],
	'id':
		[ 'id', EParseTagFuncName.STRING ],
	'login':
		[ 'login', EParseTagFuncName.STRING ],
	'message-id':
		[ 'messageId', EParseTagFuncName.STRING ],
	'mod':
		[ 'mod', EParseTagFuncName.BOOLEAN ],
	'msg-id':
		[ 'msgId', EParseTagFuncName.STRING ],
	'msg-param-anon-gift':
		[ 'msgParamAnonGift', EParseTagFuncName.BOOLEAN ],
	// "PRIMARY", "GREEN", "BLUE", "ORANGE", "PURPLE"
	'msg-param-color':
		[ 'msgParamColor', EParseTagFuncName.STRING ],
	'msg-param-cumulative-months':
		[ 'msgParamCumulativeMonths', EParseTagFuncName.NUMBER ],
	'msg-param-displayName':
		[ 'msgParamDisplayName', EParseTagFuncName.STRING ],
	'msg-param-fun-string':
		[ 'msgParamFunString', EParseTagFuncName.STRING ],
	'msg-param-gift-month-being-redeemed':
		[ 'msgParamGiftMonthBeingRedeemed', EParseTagFuncName.NUMBER ],
	'msg-param-gift-months':
		[ 'msgParamGiftMonths', EParseTagFuncName.NUMBER ],
	'msg-param-gifter-id':
		[ 'msgParamGifterId', EParseTagFuncName.STRING ],
	'msg-param-gifter-login':
		[ 'msgParamGifterLogin', EParseTagFuncName.STRING ],
	// Display name
	'msg-param-gifter-name':
		[ 'msgParamGifterName', EParseTagFuncName.STRING ],
	'msg-param-login':
		[ 'msgParamLogin', EParseTagFuncName.STRING ],
	'msg-param-mass-gift-count':
		[ 'msgParamMassGiftCount', EParseTagFuncName.NUMBER ],
	'msg-param-months':
		[ 'msgParamMonths', EParseTagFuncName.NUMBER ],
	'msg-param-multimonth-duration':
		[ 'msgParamMultimonthDuration', EParseTagFuncName.NUMBER ],
	'msg-param-multimonth-tenure':
		[ 'msgParamMultimonthTenure', EParseTagFuncName.NUMBER ],
	'msg-param-origin-id':
		[ 'msgParamOriginId', EParseTagFuncName.STRING ],
	// 'true'/'false'
	'msg-param-prior-gifter-anonymous':
		[ 'msgParamPriorGifterAnonymous', EParseTagFuncName.BOOLEAN ],
	'msg-param-prior-gifter-display-name':
		[ 'msgParamPriorGifterDisplayName', EParseTagFuncName.STRING ],
	'msg-param-prior-gifter-id':
		[ 'msgParamPriorGifterId', EParseTagFuncName.STRING ],
	'msg-param-prior-gifter-user-name':
		[ 'msgParamPriorGifterUserName', EParseTagFuncName.STRING ],
	// -profile_image-70x70.png
	'msg-param-profileImageURL':
		[ 'msgParamProfileImageUrl', EParseTagFuncName.STRING ],
	'msg-param-recipient-display-name':
		[ 'msgParamRecipientDisplayName', EParseTagFuncName.STRING ],
	'msg-param-recipient-id':
		[ 'msgParamRecipientId', EParseTagFuncName.STRING ],
	'msg-param-recipient-user-name':
		[ 'msgParamRecipientUserName', EParseTagFuncName.STRING ],
	'msg-param-sender-count':
		[ 'msgParamSenderCount', EParseTagFuncName.NUMBER ],
	'msg-param-should-share-streak':
		[ 'msgParamShouldShareStreak', EParseTagFuncName.BOOLEAN_NUMBER ],
	'msg-param-streak-months':
		[ 'msgParamStreakMonths', EParseTagFuncName.NUMBER ],
	'msg-param-sub-plan-name':
		[ 'msgParamSubPlanName', EParseTagFuncName.STRING ],
	// '1000', '2000', '3000', or 'Prime'
	'msg-param-sub-plan':
		[ 'msgParamSubPlan', EParseTagFuncName.STRING ],
	'msg-param-viewerCount':
		[ 'msgParamViewerCount', EParseTagFuncName.NUMBER ],
	// 'true'/'false'
	'msg-param-was-gifted':
		[ 'msgParamWasGifted', EParseTagFuncName.BOOLEAN ],
	'r9k':
		[ 'r9k', EParseTagFuncName.BOOLEAN_NUMBER ],
	'reply-parent-display-name':
		[ 'replyParentDisplayName', EParseTagFuncName.STRING ],
	'reply-parent-msg-body':
		[ 'replyParentMsgBody', EParseTagFuncName.STRING ],
	'reply-parent-msg-id':
		[ 'replyParentMsgId', EParseTagFuncName.STRING ],
	'reply-parent-user-id':
		[ 'replyParentUserId', EParseTagFuncName.STRING ],
	'reply-parent-user-login':
		[ 'replyParentUserLogin', EParseTagFuncName.STRING ],
	'returning-chatter':
		[ 'returningChatter', EParseTagFuncName.BOOLEAN_NUMBER ],
	'room-id':
		[ 'roomId', EParseTagFuncName.STRING ],
	'slow':
		[ 'slow', EParseTagFuncName.SLOW ],
	'subs-only':
		[ 'subsOnly', EParseTagFuncName.BOOLEAN_NUMBER ],
	'subscriber':
		[ 'subscriber', EParseTagFuncName.BOOLEAN_NUMBER ],
	'system-msg':
		[ 'systemMsg', EParseTagFuncName.STRING ],
	'target-msg-id':
		[ 'targetMsgId', EParseTagFuncName.STRING ],
	'target-user-id':
		[ 'targetUserId', EParseTagFuncName.STRING ],
	'thread-id':
		[ 'threadId', EParseTagFuncName.THREAD_ID ],
	'tmi-sent-ts':
		[ 'tmiSentTs', EParseTagFuncName.NUMBER ],
	'turbo':
		[ 'turbo', EParseTagFuncName.BOOLEAN_NUMBER ],
	'user-id':
		[ 'userId', EParseTagFuncName.STRING ],
	'user-type':
		[ 'userType', EParseTagFuncName.STRING ],
	'vip':
		[ 'vip', EParseTagFuncName.BOOLEAN_NUMBER ],
};

export const parseTagsFunc: Record<ParseTagFuncNameList, ParseTagFunc> = {
	string: (val: string) => val,
	number: (val: string) => Number(val),
	boolean: (val: string) => val === 'true',
	booleanNumber: (val: string) => val === '1',
	badges(badge: string) {
		const badges = new Map<string, string>();
		if(!badge) {
			return badges;
		}
		for(const b of badge.split(',')) {
			const [ name, version ] = b.split('/');
			badges.set(name, version);
		}
		return badges;
	},
	emotes(val: string) {
		const emotes: EmotesTag = new Map();
		if(!val) {
			return emotes;
		}
		for(const emote of val.split('/')) {
			const [ id, indices ] = emote.split(':');
			const finalIndices = indices.split(',').map(pos => {
				const [ start, end ] = pos.split('-');
				return [ Number(start), Number(end) + 1 ];
			})
			emotes.set(id, finalIndices as [ number, number ][]);
		}
		return emotes;
	},
	followersOnly(val: string) {
		return { '-1': false, '0': true }[val] ?? Number(val);
	},
	slow(val: string) {
		return { '0': false }[val] ?? Number(val);
	},
	flags(val: string, message: IrcMessage<any>): MessageFlag[] {
		const flags: MessageFlag[] = [];
		if(!val) {
			return flags;
		}
		const messageSplit = [ ...message.params ];
		for(const flag of val.split(',')) {
			const [ indices, flagType ] = flag.split(':');
			const [ start, end ] = indices.split('-');
			const index: [ number, number ] = [ Number(start), Number(end) + 1 ];
			const flagTypeSplit = flagType.split('/') as unknown as [ keyof MessageFlag['flags'], '.', string ][];
			flags.push({
				index: index,
				flags: flagTypeSplit.reduce((p, [ type, , level ]) => {
					p[type] = Number(level);
					return p;
				}, {} as MessageFlag['flags']),
				text: messageSplit.slice(...index).join(''),
			});
		}
		return flags;
	},
	threadId(val: string) {
		return val.split('_');
	}
};

export const parseTagsMap = new Map<string, [ string, ParseTagFunc ]>(
	Object.entries(_parseTagsMap)
	.map(([ key, [ name, type ] ]) => [ key, [ name, parseTagsFunc[type] ] ])
);