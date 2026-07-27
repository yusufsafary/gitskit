import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getJob, cancelJob } from '$lib/server/jobs';
import { resolve as resolvePath, join } from 'node:path';
import { listBuckets } from '$lib/server/paths';

export const GET: RequestHandler = async ({ params }) => {
	const job = getJob(params.id);
	if (!job) throw error(404, 'Job not found');

	let mediaUrl: string | null = null;
	if (job.status === 'done' && job.result) {
		const r = job.result as { outputPath?: string };
		if (r.outputPath) {
			const buckets = await listBuckets();
			for (const bucket of buckets) {
				const rel: string = r.outputPath.replace(bucket.supercutsDir + '/', '');
				if (rel !== r.outputPath) {
					mediaUrl = `/api/media/${encodeURIComponent(bucket.name)}/supercuts/${encodeURIComponent(rel)}`;
					break;
				}
			}
		}
	}

	return json({ job, mediaUrl });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const cancelled = cancelJob(params.id);
	if (!cancelled) throw error(404, 'Job not found or not running');
	return json({ cancelled: true });
};
