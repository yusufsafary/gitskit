import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import {
	startSupercut,
	startSentence,
	startSongify,
	startTranscribeOne,
	startTranscribeAll,
	listJobs
} from '$lib/server/jobs';

export const GET: RequestHandler = async () => {
	return json(listJobs());
};

export const POST: RequestHandler = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const kind = body.kind as string;

	if (kind === 'supercut') {
		const job = startSupercut({
			target: body.target as string | undefined,
			regexSource: body.regexSource as string | undefined,
			tile: body.tile as boolean | undefined,
			limit: body.limit as number | null | undefined,
			debug: body.debug as boolean | undefined,
			dryRun: body.dryRun as boolean | undefined,
			buckets: body.buckets as string[] | null | undefined
		});
		return json({ id: job.id }, { status: 202 });
	}

	if (kind === 'sentence') {
		const job = startSentence({
			sentence: body.sentence as string,
			buckets: body.buckets as string[] | null | undefined,
			seed: body.seed as number | undefined,
			debug: body.debug as boolean | undefined
		});
		return json({ id: job.id }, { status: 202 });
	}

	if (kind === 'songify') {
		const job = startSongify({
			target: typeof body.target === 'string' ? body.target : '',
			melody: typeof body.melody === 'string' ? body.melody : '',
			buckets: body.buckets as string[] | null | undefined,
			singleClip: typeof body.singleClip === 'boolean' ? body.singleClip : undefined
		});
		return json({ id: job.id }, { status: 202 });
	}

	if (kind === 'transcribe-one') {
		const job = startTranscribeOne({
			bucket: body.bucket as string,
			slug: body.slug as string
		});
		return json({ id: job.id }, { status: 202 });
	}

	if (kind === 'transcribe-all') {
		const job = startTranscribeAll({
			buckets: body.buckets as string[] | undefined
		});
		return json({ id: job.id }, { status: 202 });
	}

	throw error(400, `Unknown job kind: ${kind}`);
};
