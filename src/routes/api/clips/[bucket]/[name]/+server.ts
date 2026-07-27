import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveBuckets } from '$lib/server/paths';

export const DELETE: RequestHandler = async ({ params }) => {
	const [bucket] = await resolveBuckets([params.bucket]);
	const safeName = params.name.replace(/\.\./g, '');
	const filePath = join(bucket.supercutsDir, safeName);
	try {
		await unlink(filePath);
	} catch (e: any) {
		if (e?.code === 'ENOENT') throw error(404, 'File not found');
		throw error(500, e.message);
	}
	return json({ deleted: true });
};
