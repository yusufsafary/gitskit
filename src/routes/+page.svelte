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

	// Palette — matches design tokens
	const C_GREEN  = [110, 255,  87] as const;
	const C_PURPLE = [168,  85, 247] as const;
	const C_BLUE   = [  0, 200, 255] as const;

	let W = 0, H = 0, dpr = 1;
	let raf: number;

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W   = canvas.offsetWidth;
		H   = canvas.offsetHeight;
		canvas.width  = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.scale(dpr, dpr);
	}

	// ── Ambient orbs — 3 large blurred glows that breathe & drift ──
	const orbs = [
		{ rx: 0.12, ry: 0.35, r: 200, pal: C_GREEN,  ph: 0.0,  sp: 0.00042, dx: 0.13, dy: 0.11 },
		{ rx: 0.85, ry: 0.28, r: 260, pal: C_PURPLE, ph: 1.85, sp: 0.00031, dx: 0.09, dy: 0.14 },
		{ rx: 0.52, ry: 0.78, r: 180, pal: C_BLUE,   ph: 3.60, sp: 0.00055, dx: 0.17, dy: 0.08 },
	];

	// ── Film strip geometry ──────────────────────────────────────
	const SW   = 24;   // strip width px
	const PH   = 11;   // perforation height
	const PW   = 7;    // perforation width
	const PGAP = 26;   // perforation pitch

	function draw(ts: number) {
		ctx.clearRect(0, 0, W, H);
		const t = ts * 0.001;

		// 1 ── Ambient glowing orbs ──────────────────────────────
		for (const o of orbs) {
			const pulse = Math.sin(t * o.sp * 1000 + o.ph);
			const gx    = o.rx * W + Math.sin(t * o.dx + o.ph) * 28;
			const gy    = o.ry * H + Math.cos(t * o.dy + o.ph) * 18;
			const r     = o.r  + pulse * 18;
			const alpha = 0.055 + pulse * 0.018 + 0.015;
			const [R, G, B] = o.pal;
			const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
			grad.addColorStop(0,   `rgba(${R},${G},${B},${alpha})`);
			grad.addColorStop(0.5, `rgba(${R},${G},${B},${(alpha * 0.38).toFixed(3)})`);
			grad.addColorStop(1,   `rgba(${R},${G},${B},0)`);
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(gx, gy, r, r * 0.72, 0, 0, Math.PI * 2);
			ctx.fill();
		}

		// 2 ── Film strips (left = green, right = purple) ─────────
		const perfOffset = (t * 14) % PGAP;

		// Left strip
		ctx.fillStyle = 'rgba(110,255,87,0.06)';
		ctx.fillRect(0, 0, SW, H);
		for (let y = -PGAP + perfOffset; y < H + PGAP; y += PGAP) {
			const ry    = Math.round(y);
			const frame = ((Math.floor((y + t * 14) / PGAP) + 4096) & 0xFFF);
			ctx.fillStyle = 'rgba(110,255,87,0.22)';
			ctx.fillRect(SW - PW - 4, ry + 2, PW, PH);
			ctx.fillStyle = 'rgba(110,255,87,0.15)';
			ctx.font      = '500 5.5px "JetBrains Mono",monospace';
			ctx.textAlign = 'left';
			ctx.fillText(frame.toString(16).toUpperCase().padStart(3,'0'), 2, ry + PH);
		}
		// Separator line
		ctx.fillStyle = 'rgba(110,255,87,0.12)';
		ctx.fillRect(SW, 0, 1, H);

		// Right strip
		ctx.fillStyle = 'rgba(168,85,247,0.06)';
		ctx.fillRect(W - SW, 0, SW, H);
		for (let y = -PGAP + perfOffset; y < H + PGAP; y += PGAP) {
			const ry = Math.round(y);
			ctx.fillStyle = 'rgba(168,85,247,0.22)';
			ctx.fillRect(W - SW + 4, ry + 2, PW, PH);
		}
		ctx.fillStyle = 'rgba(168,85,247,0.12)';
		ctx.fillRect(W - SW - 1, 0, 1, H);

		// 3 ── Audio waveforms ────────────────────────────────────
		const wY  = H * 0.74;
		const wAm = H * 0.07;

		// Primary — green
		ctx.beginPath();
		const wInner = W - SW * 2 - 2;
		for (let i = 0; i <= wInner; i++) {
			const nx = i / wInner;
			const y  = wY
				+ Math.sin(nx * Math.PI *  6 + t * 2.2) * wAm * 0.48
				+ Math.sin(nx * Math.PI * 14 + t * 3.9) * wAm * 0.22
				+ Math.sin(nx * Math.PI *  3 + t * 1.1) * wAm * 0.32;
			i === 0 ? ctx.moveTo(SW + 1 + i, y) : ctx.lineTo(SW + 1 + i, y);
		}
		ctx.strokeStyle   = 'rgba(110,255,87,0.5)';
		ctx.lineWidth     = 1.5;
		ctx.shadowColor   = 'rgba(110,255,87,0.7)';
		ctx.shadowBlur    = 7;
		ctx.stroke();
		ctx.shadowBlur = 0;

		// Secondary — blue, offset up
		ctx.beginPath();
		for (let i = 0; i <= wInner; i++) {
			const nx = i / wInner;
			const y  = wY - 20
				+ Math.sin(nx * Math.PI *  9 + t * 1.6 + 1.3) * wAm * 0.28
				+ Math.sin(nx * Math.PI * 21 + t * 2.9 + 0.5) * wAm * 0.12;
			i === 0 ? ctx.moveTo(SW + 1 + i, y) : ctx.lineTo(SW + 1 + i, y);
		}
		ctx.strokeStyle = 'rgba(0,200,255,0.22)';
		ctx.lineWidth   = 1;
		ctx.stroke();

		// 4 ── Horizontal sweep line ───────────────────────────────
		const sweepT = (t * 0.07) % 1.5;
		if (sweepT < 1) {
			const sy = sweepT * H;
			const sg = ctx.createLinearGradient(0, sy - 14, 0, sy + 14);
			sg.addColorStop(0,   'rgba(0,200,255,0)');
			sg.addColorStop(0.5, 'rgba(0,200,255,0.1)');
			sg.addColorStop(1,   'rgba(0,200,255,0)');
			ctx.fillStyle = sg;
			ctx.fillRect(SW, sy - 14, W - SW * 2, 28);
		}

		// 5 ── Timecode HUD ────────────────────────────────────────
		const fr  = Math.floor(ts / (1000 / 24)) % 24;
		const ss  = Math.floor(ts / 1000) % 60;
		const mm  = Math.floor(ts / 60000) % 60;
		const hh  = Math.floor(ts / 3600000) % 24;
		const tc  = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}:${String(fr).padStart(2,'0')}`;
		ctx.font       = '600 9px "JetBrains Mono",monospace';
		ctx.fillStyle  = 'rgba(110,255,87,0.4)';
		ctx.textAlign  = 'right';
		ctx.fillText(tc, W - SW - 5, H - 7);

		// ● REC blink
		if (Math.floor(ts / 700) % 2 === 0) {
			ctx.fillStyle = 'rgba(255,71,87,0.65)';
			ctx.textAlign = 'left';
			ctx.fillText('● REC', SW + 6, H - 7);
		}
		ctx.textAlign = 'left';

		// 6 ── Sparks ────────────────────────────────────────────
while (sparks.length < SPARK_COUNT) spawnSpark();
for (let i = sparks.length - 1; i >= 0; i--) {
  const s = sparks[i];
  s.x    += s.vx;
  s.y    += s.vy;
  s.life += 1;
  if (s.life > s.maxLife || s.x < SW || s.x > W - SW) { sparks.splice(i, 1); continue; }
  const prog  = s.life / s.maxLife;
  const alpha = prog < 0.15 ? prog / 0.15 : prog > 0.75 ? (1 - prog) / 0.25 : 1;
  const [R, G, B] = s.pal;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${R},${G},${B},${(alpha * 0.85).toFixed(3)})`;
  ctx.shadowColor = `rgba(${R},${G},${B},${(alpha * 0.6).toFixed(3)})`;
  ctx.shadowBlur  = 5;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// 7 ── Vignette ───────────────────────────────────────────
		const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.9);
		vig.addColorStop(0, 'rgba(3,3,7,0)');
		vig.addColorStop(1, 'rgba(3,3,7,0.6)');
		ctx.fillStyle = vig;
		ctx.fillRect(0, 0, W, H);

		raf = requestAnimationFrame(draw);
	}

	resize();
	raf = requestAnimationFrame(draw);

	const ro = new ResizeObserver(() => { ctx.setTransform(1,0,0,1,0,0); resize(); });
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
		<div class="hero-eyebrow hero-anim-slide" style="--delay:0ms">
			<span class="tag tag-accent">Studio</span>
			<span class="tag tag-blue">{data.groups.length} buckets</span>
		</div>
		<h1 class="hero-anim-reveal" style="--delay:90ms">The <mark class="hero-mark">Library</mark>.</h1>
		<p class="hero-anim-converge" style="--delay:220ms">Every video, its audio, and word-level transcript — grouped by bucket.</p>
	</div>
	<div class="hero-corner hero-corner-tl" aria-hidden="true"></div>
	<div class="hero-corner hero-corner-br" aria-hidden="true"></div>
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
/* ══════════════════════════════════════════════════════════════
   Hero — animated cinematic block
   ══════════════════════════════════════════════════════════════ */

.hero-animated {
	position: relative;
	overflow: hidden;
	border-radius: var(--radius-xl);
	padding: clamp(2rem, 5vw, 4rem) clamp(1.75rem, 5vw, 3rem) clamp(2rem, 5vw, 3.5rem);
	min-height: 220px;
	background:
		linear-gradient(160deg, rgba(110,255,87,0.04) 0%, transparent 40%),
		linear-gradient(200deg, rgba(168,85,247,0.04) 60%, transparent 100%),
		var(--bg-2);
	border: 1px solid rgba(110,255,87,0.12);
	/* animated border glow via box-shadow */
	box-shadow:
		0 0 0 0 rgba(110,255,87,0),
		0 4px 40px rgba(0,0,0,0.5),
		inset 0 1px 0 rgba(255,255,255,0.04);
	animation: heroBorderPulse 5s ease-in-out infinite;
}

@keyframes heroBorderPulse {
	0%, 100% { box-shadow: 0 0 28px -4px rgba(110,255,87,0.08), 0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04); }
	50%       { box-shadow: 0 0 48px -2px rgba(110,255,87,0.18), 0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04); }
}

.hero-canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 0;
}

.hero-content {
	position: relative;
	z-index: 1;
	display: grid;
	gap: 1.25rem;
}

/* ── Corner bracket decorations ─────────────────────────────── */
.hero-corner {
	position: absolute;
	width: 18px;
	height: 18px;
	z-index: 2;
	pointer-events: none;
	opacity: 0;
	animation: cornerFadeIn 0.6s ease forwards 0.8s;
}

@keyframes cornerFadeIn {
	to { opacity: 1; }
}

.hero-corner-tl {
	top: 10px; left: 10px;
	border-top: 1.5px solid rgba(110,255,87,0.5);
	border-left: 1.5px solid rgba(110,255,87,0.5);
}

.hero-corner-br {
	bottom: 10px; right: 10px;
	border-bottom: 1.5px solid rgba(168,85,247,0.5);
	border-right: 1.5px solid rgba(168,85,247,0.5);
}

/* ── Eyebrow: slide in from left ─────────────────────────────── */
@keyframes heroSlide {
	from { opacity: 0; transform: translateX(-16px); filter: blur(4px); }
	to   { opacity: 1; transform: translateX(0);     filter: blur(0); }
}

.hero-anim-slide {
	opacity: 0;
	animation: heroSlide 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	animation-delay: var(--delay, 0ms);
}

/* ── H1: clip-path wipe reveal from bottom ───────────────────── */
@keyframes heroReveal {
	from { clip-path: inset(110% 0 0 0); transform: translateY(10px); }
	to   { clip-path: inset(0%   0 0 0); transform: translateY(0); }
}

.hero-anim-reveal {
	clip-path: inset(110% 0 0 0);
	animation: heroReveal 0.72s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	animation-delay: var(--delay, 0ms);
}

/* ── Subtitle: letter-spacing converge + fade ────────────────── */
@keyframes heroConverge {
	from { opacity: 0; letter-spacing: 0.22em; filter: blur(3px); }
	60%  { opacity: 0.9; }
	to   { opacity: 1; letter-spacing: inherit; filter: blur(0); }
}

.hero-anim-converge {
	opacity: 0;
	animation: heroConverge 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	animation-delay: var(--delay, 0ms);
}

/* ── Mark: glitch settle → steady pulse ─────────────────────── */
@keyframes markGlitch {
	0%        { text-shadow: none; transform: none; }
	/* initial glitch burst */
	5%        { text-shadow: -2px 0 rgba(168,85,247,0.9), 2px 0 rgba(0,200,255,0.9); transform: translateX(2px) skewX(-2deg); }
	6%        { text-shadow:  2px 0 rgba(168,85,247,0.9),-2px 0 rgba(0,200,255,0.9); transform: translateX(-2px); }
	7%        { text-shadow: -1px 0 rgba(168,85,247,0.6); transform: translateX(1px); }
	8%        { text-shadow: none; transform: none; }
	/* late random micro-glitch */
	72%       { text-shadow: none; transform: none; }
	72.5%     { text-shadow: -1px 0 rgba(168,85,247,0.7), 1px 0 rgba(0,200,255,0.7); transform: translateX(1px); }
	73%       { text-shadow: none; transform: none; }
	/* gentle continuous shimmer */
	0%, 100%  { box-shadow: 0 0 0 0 rgba(110,255,87,0); }
	50%       { box-shadow: 0 0 22px 5px rgba(110,255,87,0.38); }
}

.hero-mark {
	animation: markGlitch 6s ease-in-out infinite 1.1s;
	display: inline-block; /* needed for transform */
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
