import { ClientRequest, IncomingMessage } from 'http';
import { request as req } from 'https';

import { User } from './user';

export interface AskOptions {
	/**
	 * Fully qualified URL or partial URL to be appended to baseURL if supplied.
	 */
	url: string;
	/**
	 * Base URL to be prepended to url.
	 */
	baseURL?: string;
	/**
	 * HTTP verb to use. Defaults to GET.
	 */
	method?: string;
	/**
	 * Headers to add to the request.
	 */
	headers?: ({ [key: string]: string });
	/**
	 * Send bodies (TODO) and parse responses as JSON.
	 */
	json?: boolean;
	// TODO: Query string
}

export interface AskResponse extends IncomingMessage {
	/**
	 * Unparsed body of the response.
	 */
	rawBody: string;
	/**
	 * Possibly parsed body of the response.
	 */
	body: any;
}

/**
 * Make a simple HTTP request.
 *
 * @param {Partial<AskOptions>} options Options for the request.
 * @returns {Promise<AskResponse>}
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

/**
 * Make a request to the kraken API. Adds the base URL and v5 headers.
 *
 * @param {Partial<AskOptions>} options Options for the request.
 */
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

/**
 * Validate a user token.
 *
 * @param {string} token A user token.
 */
export function validateToken(token: string) {
	return ask({
		url: 'https://id.twitch.tv/oauth2/validate',
		headers: {
			Authorization: `OAuth ${token}`
		},
		json: true
	});
}

/**
 * Get the emotes for a user.
 *
 * @param {string|User} userID A User or a user ID to look up.
 */
export function getEmotes(userID: string | User) {
	if(userID instanceof User) {
		userID = userID.id;
	}
	return kraken({
		url: `users/${userID}/emotes`
	});
}