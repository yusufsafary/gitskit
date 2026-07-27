import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { generateNonce } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request }) => {
	let body: { address?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const { address } = body;
	if (!address || typeof address !== 'string' || address.length < 32) {
		throw error(400, 'Invalid wallet address');
	}

	const nonce = generateNonce(address);
	return json({ nonce });
};
