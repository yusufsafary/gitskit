import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import {
	createSessionToken,
	verifyWalletSignature,
	consumeNonce,
	COOKIE_NAME
} from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const next = url.searchParams.get('next') ?? '/';
		throw redirect(303, next);
	}
	return {};
};

export const actions: Actions = {
	wallet: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const walletAddress = String(data.get('address') ?? '').trim();
		const nonce = String(data.get('nonce') ?? '').trim();
		const signature = String(data.get('signature') ?? '').trim();
		const message = String(data.get('message') ?? '').trim();

		if (!walletAddress || !nonce || !signature) {
			return fail(400, { error: 'Missing wallet credentials.' });
		}

		const nonceOk = consumeNonce(walletAddress, nonce);
		if (!nonceOk) {
			return fail(401, { error: 'Invalid or expired nonce. Please try again.' });
		}

		const sigOk = await verifyWalletSignature(walletAddress, message, signature);
		if (!sigOk) {
			return fail(401, { error: 'Wallet signature verification failed.' });
		}

		const token = createSessionToken(`wallet:${walletAddress}`);
		cookies.set(COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 60 * 24 * 7
		});
		const next = url.searchParams.get('next') ?? '/';
		throw redirect(303, next);
	}
};
