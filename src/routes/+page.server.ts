import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PageServerLoad } from './$types';
import { listBuckets } from '$lib/server/paths';
import { AUDIO_EXTS, VIDEO_EXTS } from '$lib/server/paths';

interface VideoRow {
	slug: string;
	hasTranscript: boolean;
	hasAudio: boolean;
	sizeMB: number | null;
	durationSec: number;
	wordCount: number;
}

interface Group {
	name: string;
	rows: VideoRow[];
}

export const load: PageServerLoad = async () => {
	const buckets = await listBuckets();
	const groups: Group[] = [];

	let totalWords = 0;
	let totalDurationSec = 0;
	let totalVideos = 0;
	let totalTranscribed = 0;

	for (const bucket of buckets) {
		let videoFiles: string[] = [];
		try {
			videoFiles = await readdir(bucket.videosDir);
		} catch {
			groups.push({ name: bucket.name, rows: [] });
			continue;
		}

		const slugMap = new Map<string, { hasVideo: boolean; hasAudio: boolean; sizeMB: number | null }>();
		for (const f of videoFiles) {
			const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
			const isVideo = VIDEO_EXTS.has(ext);
			const isAudio = AUDIO_EXTS.has(ext);
			if (!isVideo && !isAudio) continue;
			const slug = f.slice(0, f.lastIndexOf('.'));
			const existing = slugMap.get(slug) ?? { hasVideo: false, hasAudio: false, sizeMB: null };
			if (isVideo) {
				existing.hasVideo = true;
				const info = await stat(join(bucket.videosDir, f)).catch(() => null);
				if (info) existing.sizeMB = Number((info.size / 1024 / 1024).toFixed(1));
			}
			if (isAudio) existing.hasAudio = true;
			slugMap.set(slug, existing);
		}

		let transcriptFiles: string[] = [];
		try {
			transcriptFiles = await readdir(bucket.transcriptsDir);
		} catch {
			// no transcripts yet
		}

		const transcriptSet = new Set(
			transcriptFiles
				.filter((f) => f.endsWith('.json'))
				.map((f) => f.slice(0, f.lastIndexOf('.')))
		);

		const rows: VideoRow[] = [];
		for (const [slug, info] of slugMap) {
			const hasTranscript = transcriptSet.has(slug);
			let wordCount = 0;
			let durationSec = 0;

			if (hasTranscript) {
				try {
					const { readFile } = await import('node:fs/promises');
					const raw = await readFile(join(bucket.transcriptsDir, `${slug}.json`), 'utf8');
					const data = JSON.parse(raw);
					wordCount = Array.isArray(data.words) ? data.words.length : 0;
					durationSec =
						typeof data.duration === 'number'
							? data.duration
							: Array.isArray(data.words) && data.words.length > 0
								? data.words[data.words.length - 1]?.end ?? 0
								: 0;
				} catch {
					// ignore
				}
			}

			rows.push({ slug, hasTranscript, hasAudio: info.hasAudio, sizeMB: info.sizeMB, durationSec, wordCount });
			totalVideos++;
			if (hasTranscript) totalTranscribed++;
			totalWords += wordCount;
			totalDurationSec += durationSec;
		}

		rows.sort((a, b) => a.slug.localeCompare(b.slug));
		groups.push({ name: bucket.name, rows });
	}

	return {
		groups,
		totals: { videos: totalVideos, transcribed: totalTranscribed, totalWords, totalDurationSec }
	};
};
