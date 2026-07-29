<script lang="ts">
import type { PageData } from './$types';
import { invalidateAll, goto } from '$app/navigation';
import { onMount } from 'svelte';

let { data }: { data: PageData } = $props();

let filter = $state('');
let showOnlyMissing = $state(false);
let activeBucket = $state<string>('all');

const buckets = $derived(['all', ...data.groups.map((g) => g.name)]);

const filteredGroups = $derived.by(() => {
	const q = filter.trim().toLowerCase();
	return data.groups
		.filter((g) => activeBucket === 'all' || g.name === activeBucket)
		.map((g) => ({
			name: g.name,
			rows: g.rows.filter((r) => {
				if (showOnlyMissing && r.hasTranscript) return false;
				if (!q) return true;
				return r.slug.toLowerCase().includes(q);
			})
		}));
});

function formatDuration(sec: number): string {
	if (!sec || sec <= 0) return '--';
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = Math.floor(sec % 60);
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m ${s}s`;
}

async function transcribe(bucket: string, slug: string) {
	const res = await fetch('/api/jobs', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ kind: 'transcribe-one', bucket, slug })
	});
	if (!res.ok) {
		const { message } = await res.json().catch(() => ({ message: 'error' }));
		alert(`Failed: ${message}`);
		return;
	}
	const { id } = await res.json();
	goto(`/transcribe?job=${id}`);
}

async function del(bucket: string, slug: string) {
	if (!confirm(`Delete all files for ${bucket}/${slug}?\n\nThis removes the video, audio, and transcript and cannot be undone.`))
		return;
	const res = await fetch(
		`/api/library/${encodeURIComponent(bucket)}/${encodeURIComponent(slug)}`,
		{ method: 'DELETE' }
	);
	if (!res.ok) {
		const { message } = await res.json().catch(() => ({ message: 'error' }));
		alert(`Failed: ${message}`);
		return;
	}
	await invalidateAll();
}

const totalHours = $derived(data.totals.totalDurationSec / 3600);
const transcribeRate = $derived(
	data.totals.videos > 0 ? Math.round((data.totals.transcribed / data.totals.videos) * 100) : 0
);

let heroCanvas: HTMLCanvasElement;

onMount(() => {
	const canvas = heroCanvas;
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const COLORS = ['#6eff57', '#a855f7', '#00c8ff'];
	const TERMS = [
		'00:00:00:00', '01:23:45:12', '00:12:34:08', '23:59:59:29',
		'TRANSCRIBE', 'SUPERCUT', 'CLIP', 'RENDER', 'CUT', 'SYNC',
		'▶ PLAY', '■ STOP', '● REC', '◀◀ REW', '▶▶ FFW',
		'fps:24', 'fps:30', 'fps:60', 'ch:2', 'kHz:48',
		'WAVEFORM', 'FFT', 'PCM', 'MP4', 'WEBM', 'AAC',
		'[0x00]', '[0xFF]', 'SEEK', 'TRIM', 'MERGE', 'MUTE',
	];

	interface Particle {
		x: number; y: number;
		text: string;
		color: string;
		speed: number;
		opacity: number;
		size: number;
		trail: Array<{ x: number; y: number; opacity: number }>;
	}

	let particles: Particle[] = [];
	let raf: number;
	let W = 0, H = 0;

	function resize() {
		W = canvas.offsetWidth;
		H = canvas.offsetHeight;
		canvas.width = W;
		canvas.height = H;
	}

	function spawn(): Particle {
		const color = COLORS[Math.floor(Math.random() * COLORS.length)];
		return {
			x: Math.random() * W,
			y: -30,
			text: TERMS[Math.floor(Math.random() * TERMS.length)],
			color,
			speed: 0.35 + Math.random() * 0.9,
			opacity: 0.08 + Math.random() * 0.22,
			size: 9 + Math.random() * 7,
			trail: [],
		};
	}

	resize();
	// seed initial particles spread across the canvas
	for (let i = 0; i < 28; i++) {
		const p = spawn();
		p.y = Math.random() * H;
		particles.push(p);
	}

	let lastSpawn = 0;
	function draw(ts: number) {
		ctx.clearRect(0, 0, W, H);

		// draw scanlines
		for (let y = 0; y < H; y += 4) {
			ctx.fillStyle = 'rgba(0,0,0,0.06)';
			ctx.fillRect(0, y, W, 1);
		}

		if (ts - lastSpawn > 320) {
			if (particles.length < 42) particles.push(spawn());
			lastSpawn = ts;
		}

		particles = particles.filter((p) => p.y < H + 40);

		for (const p of particles) {
			p.trail.unshift({ x: p.x, y: p.y, opacity: p.opacity });
			if (p.trail.length > 6) p.trail.pop();
			p.y += p.speed;

			// trail
			for (let i = 0; i < p.trail.length; i++) {
				const t = p.trail[i];
				ctx.globalAlpha = t.opacity * (1 - i / p.trail.length) * 0.5;
				ctx.fillStyle = p.color;
				ctx.font = `${p.size * 0.85}px 'JetBrains Mono', monospace`;
				ctx.fillText(p.text, t.x, t.y);
			}

			// main text
			ctx.globalAlpha = p.opacity;
			ctx.fillStyle = p.color;
			ctx.font = `${p.size}px 'JetBrains Mono', monospace`;
			ctx.fillText(p.text, p.x, p.y);
		}

		// waveform bars along bottom
		const bars = 80;
		const bw = W / bars;
		for (let i = 0; i < bars; i++) {
			const amp = (Math.sin(ts * 0.001 + i * 0.4) + Math.sin(ts * 0.0017 + i * 0.7)) * 0.5;
			const bh = 8 + Math.abs(amp) * 18;
			const col = COLORS[i % COLORS.length];
			ctx.globalAlpha = 0.12 + Math.abs(amp) * 0.1;
			ctx.fillStyle = col;
			ctx.fillRect(i * bw, H - bh, bw - 1, bh);
		}

		ctx.globalAlpha = 1;
		raf = requestAnimationFrame(draw);
	}

	raf = requestAnimationFrame(draw);

	const ro = new ResizeObserver(resize);
	ro.observe(canvas);

	return () => {
		cancelAnimationFrame(raf);
		ro.disconnect();
	};
});
</script>

<svelte:head>
	<title>GitSkit — Cut. Clip. Command. | Video Transcript Supercut Studio</title>
	<meta name="description" content="GitSkit is a self-hosted video transcript supercut studio. Transcribe videos with xAI, search word-level clips, and render supercuts with surgical precision." />
	<link rel="canonical" href="https://gitskit.xyz/" />
</svelte:head>

<section class="hero hero-animated">
	<canvas bind:this={heroCanvas} class="hero-canvas" aria-hidden="true"></canvas>
	<div class="hero-content">
		<div class="hero-eyebrow hero-anim-up" style="--delay:0ms">
			<span class="tag tag-accent">Studio</span>
			<span class="tag tag-blue">{data.groups.length} buckets</span>
		</div>
		<h1 class="hero-anim-up" style="--delay:80ms">The <mark>Library</mark>.</h1>
		<p class="hero-anim-up" style="--delay:180ms">Every video, its audio, and word-level transcript — grouped by bucket.</p>
	</div>
</section>

<!-- Stats -->
<section class="stat-grid">
	<div class="stat-item">
		<span class="stat-label">Buckets</span>
		<span class="stat-value">{data.groups.length}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Videos</span>
		<span class="stat-value">{data.totals.videos}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Transcribed</span>
		<span class="stat-value accent">{data.totals.transcribed}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Total words</span>
		<span class="stat-value purple">{data.totals.totalWords.toLocaleString()}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Runtime</span>
		<span class="stat-value blue">{totalHours.toFixed(1)}h</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Coverage</span>
		<span class="stat-value" style="font-size:1.75rem;">{transcribeRate}%</span>
	</div>
</section>

<!-- Filter bar -->
<section class="filter-bar">
	<div class="bucket-tabs">
		{#each buckets as b (b)}
			<button
				type="button"
				class="btn btn-small"
				class:btn-primary={activeBucket === b}
				class:btn-ghost={activeBucket !== b}
				onclick={() => (activeBucket = b)}
			>{b}</button>
		{/each}
	</div>
	<div class="filter-controls">
		<input
			type="search"
			placeholder="Search videos…"
			bind:value={filter}
			style="max-width:22rem;"
		/>
		<label class="field-check" style="white-space:nowrap;">
			<input type="checkbox" bind:checked={showOnlyMissing} />
			Missing only
		</label>
	</div>
</section>

<!-- Groups -->
{#each filteredGroups as group (group.name)}
	{#if group.rows.length > 0}
	<section class="bucket-section">
		<div class="bucket-header">
			<h2 style="font-size:var(--fs-3);">{group.name}</h2>
			<span class="tag tag-purple">{group.rows.length} video{group.rows.length !== 1 ? 's' : ''}</span>
		</div>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>File</th>
						<th>Audio</th>
						<th>Transcript</th>
						<th>Words</th>
						<th>Duration</th>
						<th>Size</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each group.rows as row (row.slug)}
					<tr>
						<td>
							<span style="font-family:var(--font-mono);font-size:var(--fs-xs);font-weight:600;">{row.slug}</span>
						</td>
						<td>
							{#if row.hasAudio}
								<span class="tag tag-accent">yes</span>
							{:else}
								<span class="muted">—</span>
							{/if}
						</td>
						<td>
							{#if row.hasTranscript}
								<span class="tag tag-blue">yes</span>
							{:else}
								<span class="muted">—</span>
							{/if}
						</td>
						<td style="font-variant-numeric:tabular-nums;font-family:var(--font-mono);font-size:var(--fs-xs);">
							{row.wordCount > 0 ? row.wordCount.toLocaleString() : '—'}
						</td>
						<td style="font-variant-numeric:tabular-nums;font-family:var(--font-mono);font-size:var(--fs-xs);">
							{formatDuration(row.durationSec)}
						</td>
						<td style="font-variant-numeric:tabular-nums;font-family:var(--font-mono);font-size:var(--fs-xs);">
							{row.sizeMB !== null ? `${row.sizeMB} MB` : '—'}
						</td>
						<td>
							<div class="row" style="gap:0.4rem;">
								{#if !row.hasTranscript}
								<button
									type="button"
									class="btn btn-small btn-primary"
									onclick={() => transcribe(group.name, row.slug)}
								>Transcribe</button>
								{/if}
								<button
									type="button"
									class="btn btn-small btn-danger"
									onclick={() => del(group.name, row.slug)}
								>Delete</button>
							</div>
						</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
	{/if}
{/each}

{#if data.groups.length === 0}
<section class="card" style="text-align:center;padding:4rem 2rem;">
	<div style="font-size:3rem;margin-bottom:1rem;opacity:0.3;">📂</div>
	<h2 style="font-size:var(--fs-3);margin-block-end:0.75rem;">No buckets found</h2>
	<p style="margin-inline:auto;">
		Create a folder under <code>videos/</code> with a <code>videos/</code> subfolder inside to get started.
		Or set <code>SYNTAX_BUCKETS_DIR</code> to point to your media directory.
	</p>
	<a href="/how-to" class="btn btn-primary" style="margin-block-start:2rem;display:inline-flex;">
		Read the setup guide →
	</a>
</section>
{/if}

<style>
/* ── Hero animated layout ───────────────────────────────────── */
.hero-animated {
	position: relative;
	overflow: hidden;
	border-radius: 12px;
	padding: 2.5rem 2rem 2rem;
	background: linear-gradient(135deg, rgba(10,10,18,0.92) 0%, rgba(3,3,7,0.96) 100%);
	border: 1px solid rgba(110,255,87,0.08);
}

.hero-canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 0;
	opacity: 0.85;
}

.hero-content {
	position: relative;
	z-index: 1;
	display: grid;
	gap: 1.25rem;
}

/* ── Text entrance animations ───────────────────────────────── */
@keyframes heroUp {
	from { opacity: 0; transform: translateY(22px); }
	to   { opacity: 1; transform: translateY(0); }
}

.hero-anim-up {
	opacity: 0;
	animation: heroUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	animation-delay: var(--delay, 0ms);
}

/* ── h1 shimmer on the mark ─────────────────────────────────── */
@keyframes markShimmer {
	0%, 100% { box-shadow: 0 0 0 0 rgba(110,255,87,0); }
	50%       { box-shadow: 0 0 18px 4px rgba(110,255,87,0.35); }
}

.hero-content h1 mark {
	animation: markShimmer 3s ease-in-out infinite 1s;
}

.hero-eyebrow {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: -0.25rem;
}

.filter-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	flex-wrap: wrap;
}

.bucket-tabs {
	display: flex;
	gap: 0.375rem;
	flex-wrap: wrap;
	align-items: center;
}

.filter-controls {
	display: flex;
	align-items: center;
	gap: 1rem;
	flex-wrap: wrap;
}

.bucket-section {
	display: grid;
	gap: 1rem;
}

.bucket-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}
</style>
