import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveBuckets } from '$lib/server/paths';

export const DELETE: RequestHandler = async ({ params }) => {
	const [bucket] = await resolveBuckets([params.bucket]);
	const slug = params.slug.replace(/\.\./g, '');

	const deleted: string[] = [];
	const dirs = [bucket.videosDir, bucket.transcriptsDir, bucket.supercutsDir];

	for (const dir of dirs) {
		let files: string[] = [];
		try {
			files = await readdir(dir);
		} catch {
			continue;
		}
		for (const file of files) {
			const base = file.slice(0, file.lastIndexOf('.'));
			if (base !== slug) continue;
			try {
				await unlink(join(dir, file));
				deleted.push(file);
			} catch {
				// ignore
			}
		}
	}

	if (deleted.length === 0) throw error(404, `No files found for slug: ${slug}`);
	return json({ deleted });
};
