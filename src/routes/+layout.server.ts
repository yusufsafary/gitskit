import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const PUBLIC_PATHS = ['/login', '/about', '/how-to', '/cookies', '/demo', '/api/auth'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isPublic = PUBLIC_PATHS.some((p) => url.pathname.startsWith(p));
	if (!locals.user && !isPublic) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	return { user: locals.user };
};
