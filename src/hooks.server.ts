import type { Handle } from '@sveltejs/kit';
import { verifySessionToken, COOKIE_NAME } from '$lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE_NAME);
	if (token) {
		const userId = verifySessionToken(token);
		if (userId) {
			event.locals.user = {
				id: userId,
				type: userId.startsWith('wallet:') ? 'wallet' : 'password'
			};
		} else {
			event.locals.user = null;
			event.cookies.delete(COOKIE_NAME, { path: '/' });
		}
	} else {
		event.locals.user = null;
	}
	return resolve(event);
};
