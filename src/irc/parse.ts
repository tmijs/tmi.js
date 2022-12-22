import { parseTagsFunc, parseTagsMap } from './parse-tags.js';
import type { EmoteIndices, EmotesTag, MessageFlag } from './parse-tags.js';

export class Command<Message extends IrcMessage> {
	constructor(public message: Message) {}
	// iterator:
	*[Symbol.iterator]() {
		yield this.command;
		yield this.prefix;
		yield this.tags;
		yield this.channel;
		yield this.username;
		yield this.displayName;
	}
	get raw() {
		return this.message.raw;
	}
	get command(): Message['command'] {
		return this.message.command;
	}
	get prefix(): Message['prefix'] {
		return this.message.prefix;
	}
	get username(): string | null {
		return this.prefix.nick;
	}
	get displayName(): string | null {
		return this.tags.displayName || this.username;
	}
	get formattedDisplayName(): string {
		if(!this.tags.displayName) {
			if(!this.username) {
				return '';
			}
			return this.username;
		}
		if(this.tags.displayName.toLowerCase() !== this.username) {
			return `${this.tags.displayName} (${this.username})`;
		}
		return this.tags.displayName;
	}
	get tags(): Message['tags'] {
		return this.message.tags;
	}
	get channel() {
		return this.message.channel;
	}
	get params() {
		return this.message.params;
	}
	log(...data: any[]) {
		console.log(`[${this.command}]`, ...data);
	}
}

export class CommandROOMSTATE extends Command<Command.ROOMSTATE.Message> {
	_isFull: boolean | null;
	roomstateTags: (keyof Omit<Command.ROOMSTATE.Message['tags'], 'roomId'>)[];
	constructor(message: Command.ROOMSTATE.Message) {
		super(message);
		this.roomstateTags = [
			'emoteOnly', 'followersOnly', 'r9k', 'slow', 'subsOnly'
		];
		this._isFull = null;
	}
	get isFull(): boolean {
		if(this._isFull === null) {
			this._isFull = 'emoteOnly' in this.tags && 'followersOnly' in this.tags;
		}
		return this._isFull;
	}
	log() {
		const { roomstateTags } = this;
		const arr = Object.entries(this.tags).reduce<string[]>((p, [ key, val ]) => {
			if(roomstateTags.includes(key as any)) {
				p.push(`${key}=${val}`);
			}
			return p;
		}, []);
		super.log(`[${this.channel}] ${arr.join(' ')}`);
	}
}

export class CommandUSERNOTICE_Unknown extends Command<Command.USERNOTICE.Message> {
}

export class CommandUSERNOTICE_Resub extends Command<Command.USERNOTICE.Resub> {
}

// '@badge-info=subscriber/3;badges=subscriber/3,sub-gifter/1;color=#FF4500;display-name=Dieing25;emotes=;flags=;id=680649a0-e386-40d7-991c-23dcd064437e;login=dieing25;mod=0;msg-id=primepaidupgrade;msg-param-sub-plan=1000;room-id=72318357;subscriber=1;system-msg=Dieing25\\sconverted\\sfrom\\sa\\sPrime\\ssub\\sto\\sa\\sTier\\s1\\ssub!;tmi-sent-ts=1662031291787;user-id=159967276;user-type= :tmi.twitch.tv USERNOTICE #ingameasylum'
export class CommandUSERNOTICE_PrimePaidUpgrade extends Command<Command.USERNOTICE.PrimePaidUpgrade> {
}

export class CommandCLEARCHAT_Base<ClearType extends Command.CLEARCHAT.Message> extends Command<Command.CLEARCHAT.Message> {
	constructor(message: Command.CLEARCHAT.Message, public type: Command.CLEARCHAT.Type) {
		super(message);
	}
	static getType(message: Command.CLEARCHAT.Message): Command.CLEARCHAT.Type {
		const { tags } = message;
		if('banDuration' in tags) {
			return 'timeout';
		}
		else if('targetUserId' in tags) {
			return 'ban';
		}
		return 'chatClear';
	}
	static getClear(message: Command.CLEARCHAT.Message) {
		const type = CommandCLEARCHAT_Base.getType(message);
		switch(type) {
			case 'timeout': {
				return new CommandCLEARCHAT_Timeout(message as Command.CLEARCHAT.Timeout);
			}
			case 'ban': {
				return new CommandCLEARCHAT_Ban(message as Command.CLEARCHAT.Ban);
			}
			case 'chatClear': {
				return new CommandCLEARCHAT_ChatClear(message as Command.CLEARCHAT.ChatClear);
			}
			default: {
				throw new Error(`Unknown clear type: ${type}`);
			}
		}
	}
	get tags(): ClearType['tags'] {
		return this.message.tags;
	}
	// log() {
	// 	const { tags, channel, username, type } = this;
	// 	if(type === 'timeout') {
	// 		super.log(`[${channel}] Time-out [${tags.targetUserId}] ${username} for ${tags.banDuration} seconds`);
	// 	}
	// 	else if('targetUserId' in tags) {
	// 		super.log(`[${channel}] Ban [${tags.targetUserId}] ${username}`);
	// 	}
	// 	else {
	// 		super.log(`[${channel}] Clear chat`);
	// 	}
	// }
}

export class CommandCLEARCHAT_Timeout extends CommandCLEARCHAT_Base<Command.CLEARCHAT.Timeout> {
	constructor(message: Command.CLEARCHAT.Timeout) {
		super(message, 'timeout');
	}
	get userId() {
		return this.tags.targetUserId || null;
	}
	get username() {
		return this.params || null;
	}
	get duration() {
		return this.tags.banDuration;
	}
	log() {
		const { tags, channel, userId, username, duration } = this;
		super.log(`[${channel}] Time-out [${userId}] ${username} for ${duration} seconds`);
	}
}

export class CommandCLEARCHAT_Ban extends CommandCLEARCHAT_Base<Command.CLEARCHAT.Ban> {
	constructor(message: Command.CLEARCHAT.Ban) {
		super(message, 'ban');
	}
	get userId() {
		return this.tags.targetUserId || null;
	}
	get username() {
		return this.params || null;
	}
	log() {
		const { tags, channel, userId, username } = this;
		super.log(`[${channel}] Ban [${userId}] ${username}`);
	}
}

export class CommandCLEARCHAT_ChatClear extends CommandCLEARCHAT_Base<Command.CLEARCHAT.ChatClear> {
	constructor(message: Command.CLEARCHAT.ChatClear) {
		super(message, 'chatClear');
	}
	log() {
		super.log(`[${this.channel}] Clear chat`);
	}
}

export class CommandPRIVMSG extends Command<Command.PRIVMSG.Message> {
	get badges(): Badges {
		return this.tags.badges;
	}
	get isBroadcaster(): boolean {
		return this.badges.has('broadcaster');
	}
	get isSub(): boolean {
		return this.badges.has('subscriber') || this.badges.has('founder');
	}
	log() {
		const RESET = '\u001b[0m';
		const color: Partial<Record<keyof BadgesData, string>> = {
			broadcaster: '\u001b[41m',
			moderator: '\u001b[42m',
			subscriber: '\u001b[44m',
			vip: '\u001b[45m',
		};
		const badges = [ ...this.badges.keys() ].reduce((p, n) => {
			if(n in color) {
				return p + `${color[n]}${n[0].toUpperCase()}${RESET}`;
			}
			return p;
		}, '');
		super.log(`[${this.channel}] ${badges ? badges + ' ' : ''}${this.displayName}: ${this.message.params}`);
	}
}

interface PrefixHostOnly {
	nick: null;
	user: null;
	host: string;
	// host: 'tmi.twitch.tv';
}
type PrefixFull = Record<'nick' | 'user' | 'host', string>;
type ChannelString = `#${string}`;

type TagsDataType = Record<string, any>;
type ITags<TagsData extends TagsDataType> = {
	[Key in keyof TagsData]: TagsData[Key];
}

export interface IrcMessage<Command extends string = string, TagsData extends TagsDataType | null = TagsDataType> {
	raw: string;
	prefix: Record<'nick' | 'user' | 'host', string | null>;
	command: Command;
	channel: ChannelString | null;
	params: string;
	// tags: Map<string, any>;
	tags: TagsData extends TagsDataType ? ITags<TagsData> : null;
}

export namespace Command {
	// interface ITags<TagsData extends Record<string, any>> extends Map<string, any> {
	// 	get<Key extends keyof TagsData>(key: Key): TagsData[Key];
	// 	has<Key extends keyof TagsData>(key: Key): boolean;
	// }
	// userType: 'mod' | 'global_mod' | 'admin' | 'staff' | 'turbo' | 'regular';
	type UserType = '';
	/** Comma-separated list of emote set IDs */
	type EmoteSets = string;
	type ChatColor = `#${string}` | '';

	export namespace IGNORED {
		type Commands = 'CAP' |'001' |'002' |'003' |'004' |'375' |'372' |'353' |'366' |'376';
		export type Message = IrcMessage<Commands, null>;
	}
	export namespace PING {
		export type Message = IrcMessage<'PING', null>;
	}
	export namespace PONG {
		export type Message = IrcMessage<'PONG', null>;
	}
	export namespace RECONNECT {
		export type Message = IrcMessage<'RECONNECT', null>;
	}
	export namespace GLOBALUSERSTATE {
		export interface TagsData {
			badgeInfo: BadgesInfo;
			badges: Badges;
			color: ChatColor;
			displayName: string;
			emoteSets: EmoteSets;
			userId: string;
			userType: UserType;
		}
		export interface Message extends IrcMessage<'GLOBALUSERSTATE', TagsData> {
			channel: ChannelString;
			prefix: PrefixHostOnly;
			params: '';
		}
	}
	export namespace USERSTATE {
		export interface TagsData {
			badgeInfo: BadgesInfo;
			badges: Badges;
			color: ChatColor;
			displayName: string;
			emoteSets: EmoteSets;
			id?: string;
			mod: boolean;
			subscriber: boolean;
			userType: UserType;
		}
		export interface Message extends IrcMessage<'USERSTATE', TagsData> {
			channel: ChannelString;
			prefix: PrefixHostOnly;
			params: '';
		}
	}
	export namespace ROOMSTATE {
		export interface TagsData {
			emoteOnly?: boolean;
			followersOnly?: boolean;
			r9k?: boolean;
			roomId: string;
			slow?: boolean;
			subsOnly?: boolean;
		}
		export interface Message extends IrcMessage<'ROOMSTATE', TagsData> {
			channel: ChannelString;
			prefix: PrefixHostOnly;
			params: '';
		}
	}
	export namespace USERNOTICE {
		interface USERNOTICE_Message<
			MsgId extends string,
			TagsData extends Record<string, any>
		> extends IrcMessage<'USERNOTICE', TagsData & { msgId: MsgId; }> {
			prefix: PrefixHostOnly;
			params: string;
		}
		export type SubPlan = '1000' | '2000' | '3000' | 'Prime';
		export type Announcement = USERNOTICE_Message<'announcement', PRIVMSG.Message['tags'] & {
			msgParamColor: 'PRIMARY' | 'ORANGE' | 'GREEN' | 'BLUE' | 'PURPLE';
			systemMsg: '';
		}>;
		export type Unraid = USERNOTICE_Message<'unraid', PRIVMSG.Message['tags'] & {
			systemMsg: 'The raid has been canceled.';
		}>;
		export type Resub = USERNOTICE_Message<'resub', PRIVMSG.Message['tags'] & {
			/** Seen values: 14 (msgParamShouldShareStreak=false) */
			msgParamCumulativeMonths: number;
			/** Seen values: 0 (msgParamShouldShareStreak=false) */
			msgParamMonths: number;
			/** Seen values: 0 (msgParamShouldShareStreak=false) */
			msgParamMultimonthDuration: number;
			/** Seen values: 0 (msgParamShouldShareStreak=false) */
			msgParamMultimonthTenure: number;
			msgParamShouldShareStreak: boolean;
			msgParamSubPlanName: string;
			msgParamSubPlan: SubPlan;
			msgParamWasGifted: boolean;
			systemMsg: `${string} subscribed at Tier ${number}. They've subscribed for ${number} months!`;
		}>;
		export type PrimePaidUpgrade = USERNOTICE_Message<'primepaidupgrade', PRIVMSG.Message['tags'] & {
			msgParamSubPlan: SubPlan;
			systemMsg: `${string} converted from a Prime sub to a Tier ${number} sub!`;
		}>;
		export type Message =
			| Announcement
			| Unraid
			| Resub;
	}
	export namespace NOTICE {
		interface MsgIdList {
			// No permission
			no_permission: 'You don\'t have permission to perform that action.';
			msg_requires_verified_phone_number: 'A verified phone number is required to chat in this channel. Please visit https://www.twitch.tv/settings/security to verify your phone number.';
			// Bad command
			unrecognized_cmd: `Unrecognized command: /${string}`;
			unavailable_command: `Sorry, "/${string}" is not available through this client.`;
			// Bad command usage
			invalid_user: `Invalid username: ${string}`;
			// Help
			cmds_available: `Commands available to you in this room (use ${string} More help: https://help.twitch.tv/s/article/chat-commands`;
			usage_disconnect: 'Usage: "/disconnect" - Reconnects to chat.';
			usage_me: 'Usage: "/me <message>" - Express an action in the third-person.';
		}

		export type ProtoMessage<Key extends keyof MsgIdList> = IrcMessage<'NOTICE', { msgId: Key }> & {
			prefix: PrefixHostOnly;
			params: MsgIdList[Key];
		};
		// No permission
		export type NoPermission = ProtoMessage<'no_permission'>;
		export type MsgRequiresVerifiedPhoneNumber = ProtoMessage<'msg_requires_verified_phone_number'>;
		// Bad command
		export type UnrecognizedCmd = ProtoMessage<'unrecognized_cmd'>;
		export type UnavailableCommand = ProtoMessage<'unavailable_command'>;
		// Bad command usage
		export type InvalidUser = ProtoMessage<'invalid_user'>;
		// Help
		export type CmdsAvailable = ProtoMessage<'cmds_available'>;
		export type UsageDisconnect = ProtoMessage<'usage_disconnect'>;
		export type UsageMe = ProtoMessage<'usage_me'>;

		export type Message =
			// No permission
			| NoPermission
			| MsgRequiresVerifiedPhoneNumber
			// Bad command
			| UnrecognizedCmd
			| UnavailableCommand
			// Bad command usage
			| InvalidUser
			// Help
			| CmdsAvailable
			| UsageDisconnect
			| UsageMe;
	}
	export namespace PRIVMSG {
		export interface TagsData {
			badgeInfo: BadgesInfo;
			badges: Badges;
			clientNonce: string;
			color: ChatColor;
			displayName: string;
			emotes: EmotesTag;
			firstMsg: boolean;
			flags: MessageFlag[];
			id: string;
			returningChatter: boolean;
			roomId: string;
			subscriber: boolean;
			tmiSentTs: number;
			turbo: boolean;
			userId: string;
			userType: UserType;
		}
		export interface TagsDataWithBits extends TagsData {
			bits: number;
		}
		export interface TagsDataWithCustomReward extends TagsData {
			customRewardId: string;
		}
		export interface MessagePlain extends IrcMessage<'PRIVMSG', TagsData> {
			channel: ChannelString;
			prefix: PrefixFull;
			params: string;
		}
		export interface MessageWithBits extends IrcMessage<'PRIVMSG', TagsDataWithBits> {
			channel: ChannelString;
			prefix: PrefixFull;
			params: string;
		}
		export interface MessageWithCustomReward extends IrcMessage<'PRIVMSG', TagsDataWithCustomReward> {
			channel: ChannelString;
			prefix: PrefixFull;
			params: string;
		}
		export type Message =
			| MessagePlain
			| MessageWithBits
			| MessageWithCustomReward;
	}
	export namespace WHISPER {
		export interface TagsData {
			badges: Badges;
			color: ChatColor;
			displayName: string;
			emotes: EmotesTag;
			messageId: string;
			threadId: [ string, string ];
			turbo: boolean;
			userId: string;
			userType: UserType;
		}
		export interface Message extends IrcMessage<'WHISPER', TagsData> {
			channel: null;
			prefix: PrefixFull;
			params: string;
		}
	}
	export namespace CLEARCHAT {
		export type Type = 'ban' | 'timeout' | 'chatClear';
		interface BaseTagsData<ClearType = Type> {
			tmiSentTs: number;
			roomId: string;
			type: ClearType;
		}
		interface CLEARCHAT_Message<ClearType extends Type, ExtraTags, Params extends string = string>
			extends IrcMessage<'CLEARCHAT', ExtraTags & BaseTagsData<ClearType>> {
			channel: ChannelString;
			prefix: PrefixHostOnly;
			params: Params;
		}
		interface TagsBan {
			targetUserId: string;
		}
		export type Ban = CLEARCHAT_Message<'ban', TagsBan>;
		export type Timeout = CLEARCHAT_Message<'timeout', TagsBan & { banDuration: number; }>;
		export type ChatClear = CLEARCHAT_Message<'chatClear', {}>;
		export type Message =
			| Ban
			| Timeout
			| ChatClear;
	}
	export namespace CLEARMSG {
		export interface Message extends IrcMessage<'CLEARMSG', {
			login: string;
			roomId: '';
			targetMsgId: string;
			tmiSentTs: number;
		}> {
			channel: ChannelString;
			prefix: PrefixHostOnly;
			params: string;
		}
	}
	export namespace JOIN {
		export type Message = IrcMessage<'JOIN', {}>;
	}
	export namespace PART {
		export type Message = IrcMessage<'PART', {}>;
	}
}

export type IrcCommand =
	// | IrcMessage
	| Command.IGNORED.Message
	| Command.PING.Message
	| Command.PONG.Message
	| Command.RECONNECT.Message
	| Command.GLOBALUSERSTATE.Message
	| Command.USERSTATE.Message
	| Command.ROOMSTATE.Message
	| Command.PRIVMSG.Message
	| Command.NOTICE.Message
	| Command.CLEARCHAT.Message
	| Command.CLEARMSG.Message
	| Command.JOIN.Message
	| Command.PART.Message
	| Command.WHISPER.Message
	| Command.USERNOTICE.Message;

interface BadgesData {
	bits?: string;
	broadcaster?: string;
	founder?: string;
	moderator?: string;
	premium?: string;
	subscriber?: string;
	turbo?: string;
	vip?: string;
}
interface BadgesInfoData {
	subscriber?: string;
	founder?: string;
}

export interface Badges<Data = BadgesData> extends Map<keyof Data, unknown> {
	get<Key extends keyof Data>(key: Key): Data[Key];
	set<Key extends keyof Data>(key: Key, value: Data[Key]): this;
	has<Key extends keyof Data>(key: Key): boolean;
}
export type BadgesInfo = Badges<BadgesInfoData>;

// https://ircv3.net/specs/extensions/message-tags.html#escaping-values
const ircEscapedChars = Object.fromEntries([
	// [ '\0', '0', ],
	[ 's', ' ' ],
	[ 'n', '\n' ],
	[ 'r', '\r' ],
	[ ':', ';' ],
	[ '\\', '\\\\' ],
]);
const ircUnescapedChars = Object.fromEntries([
	// [ 0, '\0' ],
	[ ' ', 's' ],
	[ '\n', 'n' ],
	[ '\r', 'r' ],
	[ ';', ':' ],
	[ '\\\\', '\\' ],
]);

function unescapeIrc(value: string) {
	return value.replace(/\\[snr;\\]/g, match => ircEscapedChars[match[1]]);
}

function escapeIrc(value: string) {
	return value.replace(/[\0\s\n\r;\\]/g, match => '\\' + ircUnescapedChars[match] || match);
}

export function parseIrcLine(line: string): undefined | IrcMessage {
	if(!line) {
		return;
	}
	const getNextSpace = () => line.indexOf(' ');
	const getNextSpaceOrEnd = () => {
		const nextSpace = getNextSpace();
		return nextSpace === -1 ? line.length : nextSpace;
	};
	const advancedToNextSpaceOrEnd = () => line = line.slice(getNextSpaceOrEnd() + 1);
	const firstCharIs = (char: string) => line[0] === char;
	const raw = line;
	const tagMap: IrcMessage['tags'] = {};
	let tagsRaw: string[] = [];
	if(firstCharIs('@')) {
		tagsRaw = line.split(' ', 1)[0].slice(1).split(';');
		advancedToNextSpaceOrEnd();
	}
	const prefix: IrcMessage['prefix'] = { nick: null, user: null, host: null };
	if(firstCharIs(':')) {
		const nextSpace = getNextSpace();
		const prefixRaw = line.slice(1, nextSpace);
		if(prefixRaw.includes('!')) {
			[ prefix.nick, prefix.user ] = prefixRaw.split('!');
			if(prefix.user.includes('@')) {
				[ prefix.user, prefix.host ] = prefix.user.split('@');
			}
		}
		else if(prefixRaw.includes('@')) {
			[ prefix.nick, prefix.host ] = prefixRaw.split('@');
		}
		else {
			prefix.host = prefixRaw;
		}
		line = line.slice(nextSpace + 1);
	}
	const command: IrcMessage['command'] = line.split(' ', 1)[0];
	advancedToNextSpaceOrEnd();
	let channel: IrcMessage['channel'] = null;
	if(firstCharIs('#')) {
		channel = line.split(' ', 1)[0] as IrcMessage['channel'];
		advancedToNextSpaceOrEnd();
	}
	const params: IrcMessage['params'] = line.slice(line.indexOf(' :') + 2);
	const message = { raw, prefix, command, channel, params, tags: tagMap };
	for(const tag of tagsRaw) {
		const [ key, value ] = tag.split('=');
		if(!parseTagsMap.has(key)) {
			console.warn('Unknown tag:', { key, value });
		}
		const [ name, parseFunc ] = parseTagsMap.get(key) ?? [ key, parseTagsFunc.string ];
		tagMap[name] = parseFunc(unescapeIrc(value), message);
	}
	return message;
}

export function extractEmoteName(emoteId: string, tag: EmotesTag | EmoteIndices, message: string): string | null {
	if(!Array.isArray(tag)) {
		const indices = tag.get(emoteId);
		if(!indices) {
			return null;
		}
		tag = indices;
	}
	if(!tag) {
		return null;
	}
	return [ ...message ].slice(tag[0][0], tag[0][1]).join('');
}