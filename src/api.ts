import { ClientRequest, IncomingMessage } from 'http';
import { request as req } from 'https';

import { User } from './user';

export interface AskOptions {
	url: string;
	baseURL?: string;
	method?: string;
	headers?: ({ [key: string]: string });
	json?: boolean;
}

export interface AskResponse extends IncomingMessage {
	rawBody: string;
	body: any;
}

/**
 * Make a simple HTTP request.
 * 
 * @param options Options for the request.
 */
export function ask(options: Partial<AskOptions>): Promise<AskResponse> {
	return new Promise((resolve, reject) => {
		let data = '';
		let error: Error = null;
		let request: ClientRequest;
		let response: AskResponse;
		const onResponseEnd = () => {
			if(error) {
				return reject(error);
			}
			let body = data;
			if(options.json) {
				try {
					body = JSON.parse(data);
				} catch(err) {
					body = null;
				}
			}
			Object.assign({
				rawBody: data,
				body
			});
			resolve(response);
		};
		const onResponse = (res: IncomingMessage) => {
			response = res as AskResponse;
			response.on('data', chunk => data += chunk);
			response.on('end', onResponseEnd);
		};
		request = req(
			options.url,
			{
				headers: { ...options.headers },
				method: options.method
			},
			onResponse
		);
		request.on('error', err => error = err);
		request.end();
	});
}

export function kraken(options: Partial<AskOptions>) {
	const headers = {
		Accept: 'application/vnd.twitchtv.v5+json'
	};
	return ask({
		...options,
		baseURL: 'https://api.twitch.tv/kraken/',
		json: true,
		headers: {
			...options.headers,
			...headers
		}
	});
}

export function validateToken(token: string) {
	return ask({
		url: 'https://id.twitch.tv/oauth2/validate',
		headers: {
			Authorization: `OAuth ${token}`
		},
		json: true
	});
}

export function getEmotes(userID: string | User) {
	if(userID instanceof User) {
		userID = userID.id;
	}
	return kraken({
		url: `users/${userID}/emotes`
	});
}