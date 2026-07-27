import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { COOKIE_NAME } from '$lib/server/auth.js';

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete(COOKIE_NAME, { path: '/' });
	throw redirect(303, '/login');
};
