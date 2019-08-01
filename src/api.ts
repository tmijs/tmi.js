import { ClientRequest, IncomingMessage } from 'http';
import { request as req } from 'https';

import { User } from './user';

export interface FetchOptions {
	url: string;
	baseURL: string;
	method?: string;
	headers?: ({ [key: string]: string });
	json?: boolean;
}

export interface FetchResponse extends IncomingMessage {
	rawBody: string;
	body: any;
}

/**
 * 
 * @param {FetchOptions} options Options for the request.
 */
export function fetch(options: Partial<FetchOptions>): Promise<FetchResponse> {
	return new Promise((resolve, reject) => {
		let data = '';
		let error: Error = null;
		let request: ClientRequest;
		let response: FetchResponse;
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
			response = res as FetchResponse;
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

export function kraken(options: Partial<FetchOptions>) {
	const headers = {
		Accept: 'application/vnd.twitchtv.v5+json'
	};
	return fetch({
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
	return fetch({
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