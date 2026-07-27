import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveBuckets } from '$lib/server/paths';

function lookup(ext: string): string {
	const m: Record<string, string> = {
		mp4: 'video/mp4',
		mp3: 'audio/mpeg',
		m4a: 'audio/mp4',
		wav: 'audio/wav',
		json: 'application/json'
	};
	return m[ext.toLowerCase()] ?? 'application/octet-stream';
}

export const GET: RequestHandler = async ({ params, request }) => {
	const [bucket] = await resolveBuckets([params.bucket]);
	const kind = params.kind;

	let dir: string;
	if (kind === 'videos') dir = bucket.videosDir;
	else if (kind === 'supercuts') dir = bucket.supercutsDir;
	else if (kind === 'transcripts') dir = bucket.transcriptsDir;
	else throw error(400, `Unknown kind: ${kind}`);

	const safeName = params.name.replace(/\.\./g, '');
	const filePath = join(dir, safeName);

	let stat: ReturnType<typeof statSync>;
	try {
		stat = statSync(filePath);
	} catch {
		throw error(404, 'File not found');
	}

	const ext = safeName.split('.').pop() ?? '';
	const contentType = lookup(ext);
	const total = stat.size;
	const rangeHeader = request.headers.get('range');

	if (rangeHeader) {
		const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
		if (!match) throw error(416, 'Bad range');
		const start = parseInt(match[1]);
		const end = match[2] ? parseInt(match[2]) : total - 1;
		const chunkSize = end - start + 1;

		const stream = createReadStream(filePath, { start, end });
		return new Response(stream as any, {
			status: 206,
			headers: {
				'Content-Range': `bytes ${start}-${end}/${total}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': String(chunkSize),
				'Content-Type': contentType
			}
		});
	}

	const stream = createReadStream(filePath);
	return new Response(stream as any, {
		headers: {
			'Content-Length': String(total),
			'Content-Type': contentType,
			'Accept-Ranges': 'bytes'
		}
	});
};
