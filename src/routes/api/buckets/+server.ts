import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { listBuckets } from '$lib/server/paths';
import { readdir } from 'node:fs/promises';

export const GET: RequestHandler = async () => {
	const buckets = await listBuckets();
	const result = await Promise.all(
		buckets.map(async (b) => {
			let videoCount = 0;
			let transcriptCount = 0;
			try {
				const videos = await readdir(b.videosDir);
				videoCount = videos.filter((f) => /\.(mp4|mkv|mov|webm|avi|mp3|m4a|wav)$/i.test(f)).length;
			} catch {
				// ignore
			}
			try {
				const transcripts = await readdir(b.transcriptsDir);
				transcriptCount = transcripts.filter((f) => f.endsWith('.json')).length;
			} catch {
				// ignore
			}
			return { name: b.name, videoCount, transcriptCount };
		})
	);
	return json({ buckets: result });
};
