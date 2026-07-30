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

let W = 0, H = 0, dpr = 1;
let raf: number;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W   = canvas.offsetWidth;
  H   = canvas.offsetHeight;
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ── Layout constants ─────────────────────────────────────────
const LABEL_W   = 42;   // left track-label column width
const RULER_H   = 18;   // ruler height at bottom
const HUD_H     = 22;   // top HUD bar
const TRACK_GAP = 2;    // gap between tracks
const PLAYHEAD_X_FRAC = 0.34; // playhead at 34% of timeline width

// ── Track definitions ────────────────────────────────────────
const TRACKS = [
  { id: 'V1', label: 'V1', kind: 'video', color: [110, 255, 87]   as const },
  { id: 'V2', label: 'V2', kind: 'video', color: [168,  85, 247]  as const },
  { id: 'A1', label: 'A1', kind: 'audio', color: [0,   200, 255]  as const },
  { id: 'A2', label: 'A2', kind: 'audio', color: [255, 165,  50]  as const },
  { id: 'SB', label: 'SB', kind: 'sub',   color: [255, 255, 255]  as const },
];

// ── Clip data: [startSec, durationSec, label] ────────────────
// Timeline is 30 "seconds" wide, scrolls continuously
const CLIPS: Record<string, Array<[number, number, string]>> = {
  V1: [[0,5,'interview-02'],[6,7,'broll-city'],[14,4,'cutaway-01'],[19,8,'main-wide'],[28,5,'closeup-03']],
  V2: [[2,4,'broll-rain'],[8,6,'overlay-map'],[16,3,'transition'],[21,7,'alt-angle'],[30,4,'broll-hands']],
  A1: [[0,8,'narration-a'],[9,5,'ambient'],[15,9,'interview-snd'],[25,9,'music-bed']],
  A2: [[3,6,'foley-01'],[11,4,'sfx-wind'],[17,8,'bgm-low'],[27,7,'foley-02']],
  SB: [[1,2,'The'],[2.5,2,'city'],[4.5,3,'never sleeps'],[8,2,'but'],[10,3,'we do'],[14,4,'cut here'],[19,2,'roll'],[21,3,'wide shot'],[25,4,'fade out']],
};

// ── Pre-generate waveform data for audio clips ────────────────
const WAVE_SEED: number[] = [];
for (let i = 0; i < 200; i++) WAVE_SEED.push(Math.random());

// ── Scroll state ─────────────────────────────────────────────
// scrollSec = current timeline position at left edge (scrolls forward)
const SCROLL_SPEED = 2.5; // seconds per real second

function draw(ts: number) {
  ctx.clearRect(0, 0, W, H);
  const t = ts * 0.001;
  const scrollSec = (t * SCROLL_SPEED) % 34; // loop every 34 "seconds"

  const timelineW = W - LABEL_W;
  const timelinePx = timelineW;        // total width in px for our 30s window
  const secToPx = (sec: number) => sec * (timelinePx / 30); // px per second
  const playheadX = LABEL_W + timelineW * PLAYHEAD_X_FRAC;

  // Track height computation
  const trackAreaH = H - HUD_H - RULER_H;
  const nTracks = TRACKS.length;
  const trackH = Math.floor((trackAreaH - TRACK_GAP * (nTracks - 1)) / nTracks);

  // ── 1. Background ───────────────────────────────────────────
  ctx.fillStyle = 'rgba(3,3,7,0.92)';
  ctx.fillRect(0, 0, W, H);

  // Subtle vignette
  const vig = ctx.createRadialGradient(W*0.5, H*0.5, H*0.1, W*0.5, H*0.5, H*0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // ── 2. HUD bar ──────────────────────────────────────────────
  ctx.fillStyle = 'rgba(10,10,18,0.9)';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = 'rgba(26,26,46,0.8)';
  ctx.fillRect(0, HUD_H - 1, W, 1);

  // Timecode
  const curSec  = scrollSec + 30 * PLAYHEAD_X_FRAC;
  const tcH     = Math.floor(curSec / 3600) % 24;
  const tcM     = Math.floor(curSec / 60) % 60;
  const tcS     = Math.floor(curSec) % 60;
  const tcF     = Math.floor((curSec % 1) * 24);
  const tc      = `${String(tcH).padStart(2,'0')}:${String(tcM).padStart(2,'0')}:${String(tcS).padStart(2,'0')}:${String(tcF).padStart(2,'0')}`;
  ctx.font      = `600 9px "JetBrains Mono",monospace`;
  ctx.fillStyle = 'rgba(110,255,87,0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tc, LABEL_W + 6, HUD_H / 2);

  // REC blink
  if (Math.floor(ts / 900) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,71,87,0.8)';
    ctx.textAlign = 'right';
    ctx.fillText('● REC', W - 8, HUD_H / 2);
  }

  // Frame rate badge
  ctx.fillStyle = 'rgba(80,80,120,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('24fps', W * 0.5, HUD_H / 2);

  // ── 3. Label column background ──────────────────────────────
  ctx.fillStyle = 'rgba(8,8,16,0.95)';
  ctx.fillRect(0, HUD_H, LABEL_W, H - HUD_H);
  ctx.fillStyle = 'rgba(26,26,46,0.9)';
  ctx.fillRect(LABEL_W - 1, HUD_H, 1, H - HUD_H);

  // ── 4. Draw each track ──────────────────────────────────────
  TRACKS.forEach((track, ti) => {
    const [R, G, B] = track.color;
    const trackY = HUD_H + ti * (trackH + TRACK_GAP);

    // Track background (alternating)
    ctx.fillStyle = ti % 2 === 0
      ? 'rgba(12,12,22,0.6)'
      : 'rgba(8,8,16,0.4)';
    ctx.fillRect(LABEL_W, trackY, timelineW, trackH);

    // Track label
    ctx.font = `600 8px "JetBrains Mono",monospace`;
    ctx.fillStyle = `rgba(${R},${G},${B},0.75)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(track.label, LABEL_W / 2, trackY + trackH / 2);

    // Track label side accent
    ctx.fillStyle = `rgba(${R},${G},${B},0.4)`;
    ctx.fillRect(0, trackY, 2, trackH);

    // Track grid lines (faint vertical ticks every 2 seconds)
    for (let gridSec = 0; gridSec <= 30; gridSec += 2) {
      const gx = LABEL_W + secToPx(gridSec - scrollSec % 2);
      if (gx >= LABEL_W && gx <= W) {
        ctx.fillStyle = 'rgba(26,26,46,0.5)';
        ctx.fillRect(Math.round(gx), trackY, 1, trackH);
      }
    }

    // Track separator line
    if (ti < TRACKS.length - 1) {
      ctx.fillStyle = 'rgba(26,26,46,0.8)';
      ctx.fillRect(0, trackY + trackH, W, TRACK_GAP);
    }

    // ── Draw clips in this track ──────────────────────────────
    const clips = CLIPS[track.id] ?? [];
    clips.forEach(([startSec, durSec, label]) => {
      // Repeat clips by cycling them across the scrolling timeline
      // Each clip repeats every 34s cycle
      for (let cycle = -1; cycle <= 2; cycle++) {
        const clipStart = startSec + cycle * 34;
        const clipEnd   = clipStart + durSec;
        const cx1 = LABEL_W + secToPx(clipStart - scrollSec);
        const cx2 = LABEL_W + secToPx(clipEnd   - scrollSec);

        if (cx2 < LABEL_W || cx1 > W) continue;
        const clipX = Math.max(cx1, LABEL_W);
        const clipW = Math.min(cx2, W) - clipX;
        if (clipW <= 0) continue;

        // Is playhead crossing this clip?
        const phOver = playheadX >= cx1 && playheadX <= cx2;
        const alpha  = phOver ? 0.85 : 0.52;
        const edgeAlpha = phOver ? 0.95 : 0.5;

        // Clip body
        const clipGrad = ctx.createLinearGradient(cx1, trackY + 2, cx1, trackY + trackH - 2);
        clipGrad.addColorStop(0,   `rgba(${R},${G},${B},${alpha * 0.55})`);
        clipGrad.addColorStop(0.5, `rgba(${R},${G},${B},${alpha * 0.38})`);
        clipGrad.addColorStop(1,   `rgba(${R},${G},${B},${alpha * 0.55})`);
        ctx.fillStyle = clipGrad;
        ctx.beginPath();
        ctx.roundRect(Math.max(cx1, LABEL_W), trackY + 2, clipW, trackH - 4, 2);
        ctx.fill();

        // Clip border
        ctx.strokeStyle = `rgba(${R},${G},${B},${edgeAlpha})`;
        ctx.lineWidth   = phOver ? 1.5 : 0.75;
        ctx.stroke();

        // Playhead-crossing glow
        if (phOver) {
          ctx.shadowColor = `rgba(${R},${G},${B},0.6)`;
          ctx.shadowBlur  = 10;
          ctx.stroke();
          ctx.shadowBlur  = 0;
        }

        // ── Audio: waveform bars ────────────────────────────
        if (track.kind === 'audio' && clipW > 10) {
          const barW  = 2;
          const barGap = 1;
          const barStep = barW + barGap;
          const waveY  = trackY + trackH * 0.5;
          const waveAm = (trackH * 0.38);
          let bi = 0;
          for (let bx = clipX + 1; bx < Math.min(cx2, W) - barW; bx += barStep) {
            const seed = WAVE_SEED[(bi + Math.floor(clipStart * 11)) % WAVE_SEED.length];
            const amp  = (0.3 + seed * 0.7) * waveAm * (phOver ? 1.0 : 0.65);
            const twitch = Math.sin(t * (3 + bi * 0.4) + bi) * 0.08 * waveAm;
            const bh   = amp + twitch;
            ctx.fillStyle = `rgba(${R},${G},${B},${phOver ? 0.75 : 0.5})`;
            ctx.fillRect(Math.round(bx), Math.round(waveY - bh), barW, Math.round(bh * 2));
            bi++;
          }
        }

        // ── Video: subtle scan lines ─────────────────────────
        if (track.kind === 'video' && clipW > 12) {
          const scanStep = 4;
          ctx.strokeStyle = `rgba(${R},${G},${B},0.06)`;
          ctx.lineWidth   = 1;
          for (let sy = trackY + 4; sy < trackY + trackH - 4; sy += scanStep) {
            ctx.beginPath();
            ctx.moveTo(Math.max(cx1, LABEL_W), sy);
            ctx.lineTo(Math.min(cx2, W), sy);
            ctx.stroke();
          }
          // Clip label (truncated)
          if (clipW > 30 && cx1 > LABEL_W) {
            ctx.font      = `500 7px "JetBrains Mono",monospace`;
            ctx.fillStyle = `rgba(${R},${G},${B},0.7)`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const maxChars = Math.floor(clipW / 5.5);
            const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
            ctx.fillText(displayLabel, cx1 + 4, trackY + trackH / 2);
          }
        }

        // ── Subtitle markers ────────────────────────────────
        if (track.kind === 'sub') {
          const wordAlpha = phOver ? 0.9 : 0.5;
          ctx.font      = `600 8px "JetBrains Mono",monospace`;
          ctx.fillStyle = `rgba(${R},${G},${B},${wordAlpha})`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          if (cx1 > LABEL_W && clipW > 8) {
            ctx.fillText(`"${label}"`, cx1 + 3, trackY + trackH / 2);
          }
        }
      }
    });
  });

  // ── 5. Ruler (bottom) ───────────────────────────────────────
  const rulerY = H - RULER_H;
  ctx.fillStyle = 'rgba(10,10,18,0.95)';
  ctx.fillRect(LABEL_W, rulerY, timelineW, RULER_H);
  ctx.fillStyle = 'rgba(26,26,46,0.9)';
  ctx.fillRect(LABEL_W, rulerY, timelineW, 1);

  // Ruler ticks + time labels
  const minorStep = 0.5; // seconds between minor ticks
  const majorStep = 2;   // seconds between major ticks
  for (let sec = Math.floor(scrollSec); sec <= scrollSec + 32; sec += minorStep) {
    const rx = LABEL_W + secToPx(sec - scrollSec);
    if (rx < LABEL_W || rx > W) continue;
    const isMajor = Math.round(sec / majorStep) * majorStep === Math.round(sec * 2) / 2;
    const tickH = isMajor ? 7 : 4;
    ctx.fillStyle = isMajor ? 'rgba(110,255,87,0.45)' : 'rgba(110,255,87,0.18)';
    ctx.fillRect(Math.round(rx), rulerY + 1, 1, tickH);
    if (isMajor && Math.round(sec * 2) % (majorStep * 2) === 0) {
      const lSec = Math.round(sec);
      const lM   = Math.floor(lSec / 60);
      const lS   = lSec % 60;
      ctx.font      = '500 7px "JetBrains Mono",monospace';
      ctx.fillStyle = 'rgba(110,255,87,0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${String(lM).padStart(2,'0')}:${String(lS).padStart(2,'0')}`, rx, rulerY + 9);
    }
  }

  // ── 6. Playhead ─────────────────────────────────────────────
  const phPulse = 0.6 + Math.sin(t * 4) * 0.15;
  // Playhead shadow/glow
  const phGrad = ctx.createLinearGradient(playheadX - 8, 0, playheadX + 8, 0);
  phGrad.addColorStop(0,   'rgba(255,255,255,0)');
  phGrad.addColorStop(0.5, `rgba(255,255,255,${phPulse * 0.12})`);
  phGrad.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = phGrad;
  ctx.fillRect(playheadX - 8, HUD_H, 16, H - HUD_H);

  // Playhead line
  ctx.strokeStyle = `rgba(255,255,255,${phPulse})`;
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.moveTo(Math.round(playheadX) + 0.5, HUD_H);
  ctx.lineTo(Math.round(playheadX) + 0.5, H - RULER_H);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Playhead top handle (diamond)
  ctx.fillStyle  = `rgba(255,255,255,${phPulse})`;
  ctx.beginPath();
  ctx.moveTo(playheadX, HUD_H);
  ctx.lineTo(playheadX + 5, HUD_H + 6);
  ctx.lineTo(playheadX, HUD_H + 12);
  ctx.lineTo(playheadX - 5, HUD_H + 6);
  ctx.closePath();
  ctx.fill();

  // ── 7. Timeline / ruler label column bottom ──────────────────
  ctx.fillStyle = 'rgba(8,8,16,0.95)';
  ctx.fillRect(0, rulerY, LABEL_W, RULER_H);
  ctx.font      = '600 7px "JetBrains Mono",monospace';
  ctx.fillStyle = 'rgba(80,80,120,0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TIME', LABEL_W / 2, rulerY + RULER_H / 2);

  // ── 8. Active-track highlight (which track is playhead touching) ──
  TRACKS.forEach((track, ti) => {
    const trackY = HUD_H + ti * (trackH + TRACK_GAP);
    const clips  = CLIPS[track.id] ?? [];
    const [R, G, B] = track.color;
    const phOver = clips.some(([startSec, durSec]) => {
      for (let cycle = -1; cycle <= 2; cycle++) {
        const cs = startSec + cycle * 34 - scrollSec;
        const ce = cs + durSec;
        const cx1 = LABEL_W + secToPx(cs);
        const cx2 = LABEL_W + secToPx(ce);
        if (playheadX >= cx1 && playheadX <= cx2) return true;
      }
      return false;
    });
    if (phOver) {
      ctx.fillStyle = `rgba(${R},${G},${B},0.04)`;
      ctx.fillRect(LABEL_W, trackY, timelineW, trackH);
    }
  });

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
