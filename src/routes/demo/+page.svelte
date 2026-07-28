<svelte:head>
	<title>Demo - GitSkit | See It In Action</title>
	<meta name="description" content="See GitSkit in action. Watch a live demo of video transcript supercuts, sentence builder, and songify features." />
	<link rel="canonical" href="https://gitskit.xyz/demo" />
	<meta property="og:title" content="GitSkit Demo - See It In Action" />
	<meta property="og:description" content="Watch a live demo of GitSkit. Supercuts, sentence builder, songify - all from word-level transcripts." />
	<meta property="og:url" content="https://gitskit.xyz/demo" />
</svelte:head>

<section class="hero">
	<h1><mark>Demo</mark> GitSkit.</h1>
	<p>See what GitSkit can do with a sample media library. No setup required.</p>
</section>

<hr class="rule" />

<!-- Sample Supercut Output -->
<section class="stack">
	<div>
		<h2>Sample Supercut</h2>
		<p>Every time the word "actually" appears across 3 podcast episodes, rendered in seconds.</p>
	</div>

	<div class="demo-player">
		<div class="demo-badge">DEMO OUTPUT</div>
		<div class="demo-waveform" aria-hidden="true">
			{#each Array(28) as _, i}
				<div class="demo-bar" style="--h: {20 + Math.sin(i * 0.8) * 15 + Math.cos(i * 1.3) * 10}%"></div>
			{/each}
		</div>
		<div class="demo-stats">
			<div class="demo-stat-item">
				<span class="demo-num">47</span>
				<span class="demo-label">clips matched</span>
			</div>
			<div class="demo-stat-item">
				<span class="demo-num">2m 31s</span>
				<span class="demo-label">total runtime</span>
			</div>
			<div class="demo-stat-item">
				<span class="demo-num">3</span>
				<span class="demo-label">buckets searched</span>
			</div>
		</div>
	</div>
</section>

<hr class="rule" />

<!-- Feature Cards -->
<section class="features-grid">

	<!-- Supercut -->
	<div class="feature-card">
		<div class="feature-top">
			<div class="feature-icon accent-green">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<polygon points="5 3 19 12 5 21 5 3"></polygon>
				</svg>
			</div>
			<h3>Supercut</h3>
		</div>
		<p>Clip every match of a phrase, regex, or AI pattern across your entire library.</p>
		<div class="feature-demo">
			<div class="demo-query">
				<span class="tag tag-accent">phrase</span>
				<code>"actually"</code>
			</div>
			<div class="clip-timeline">
				<div class="clip-row">
					<span class="clip-label">ep-001</span>
					<div class="clips">
						{#each [1.2, 0.8, 1.5, 0.9, 1.1] as dur}
							<div class="clip" style="--w: {Math.round(dur * 24)}px; --bg: var(--accent)"></div>
						{/each}
					</div>
				</div>
				<div class="clip-row">
					<span class="clip-label">ep-002</span>
					<div class="clips">
						{#each [0.7, 1.3, 0.9] as dur}
							<div class="clip" style="--w: {Math.round(dur * 24)}px; --bg: var(--accent-2)"></div>
						{/each}
					</div>
				</div>
				<div class="clip-row">
					<span class="clip-label">ep-003</span>
					<div class="clips">
						{#each [1.0, 0.8, 1.4, 1.1] as dur}
							<div class="clip" style="--w: {Math.round(dur * 24)}px; --bg: var(--accent-3)"></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Sentence Builder -->
	<div class="feature-card">
		<div class="feature-top">
			<div class="feature-icon accent-purple">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
				</svg>
			</div>
			<h3>Sentence Builder</h3>
		</div>
		<p>Pick one clip per word from transcripts and stitch them together.</p>
		<div class="feature-demo">
			<div class="words-grid">
				{#each [
					{ w: 'they',  color: 'var(--accent)',   src: 'ep-001' },
					{ w: 'never', color: 'var(--accent-2)', src: 'ep-002' },
					{ w: 'said',  color: 'var(--accent-3)', src: 'ep-003' },
					{ w: 'that',  color: 'var(--accent)',   src: 'ep-001' },
				] as item}
					<div class="word-chip" style="--c: {item.color}">
						<span class="word-text">{item.w}</span>
						<span class="word-src">{item.src}</span>
					</div>
				{/each}
			</div>
			<div class="arrow-row">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" aria-hidden="true">
					<line x1="5" y1="12" x2="19" y2="12"></line>
					<polyline points="12 5 19 12 12 19"></polyline>
				</svg>
				<span class="muted" style="font-size:var(--fs-small);">stitched clip</span>
			</div>
		</div>
	</div>

	<!-- Songify -->
	<div class="feature-card">
		<div class="feature-top">
			<div class="feature-icon accent-cyan">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M9 18V5l12-2v13"></path>
					<circle cx="6" cy="18" r="3"></circle>
					<circle cx="18" cy="16" r="3"></circle>
				</svg>
			</div>
			<h3>Songify</h3>
		</div>
		<p>Detect pitch and arrange clips into a melody. Turn any transcript into a song.</p>
		<div class="feature-demo">
			<div class="melody">
				{#each [
					{ note: 'C4', h: 35 },
					{ note: 'E4', h: 55 },
					{ note: 'G4', h: 75 },
					{ note: 'C5', h: 95 },
					{ note: 'G4', h: 75 },
					{ note: 'E4', h: 55 },
					{ note: 'C4', h: 35 },
				] as n}
					<div class="melody-bar" style="--mh: {n.h}%">
						<span class="note-label">{n.note}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Transcription -->
	<div class="feature-card">
		<div class="feature-top">
			<div class="feature-icon accent-green">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="11" cy="11" r="8"></circle>
					<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
				</svg>
			</div>
			<h3>Transcription</h3>
		</div>
		<p>Word-level timestamps via xAI speech-to-text. Every word is precisely seekable.</p>
		<div class="feature-demo">
			<div class="transcript-words">
				{#each [
					{ word: 'Welcome', start: '0.12s' },
					{ word: 'to',      start: '0.60s' },
					{ word: 'the',     start: '0.74s' },
					{ word: 'show',    start: '0.90s' },
				] as w}
					<div class="transcript-chip">
						<span class="t-word">{w.word}</span>
						<span class="t-ts">{w.start}</span>
					</div>
				{/each}
				<span class="muted" style="font-size:var(--fs-small);">...</span>
			</div>
		</div>
	</div>

</section>

<hr class="rule" />

<!-- Stats showcase -->
<section class="stack">
	<div>
		<h2>Sample Library Stats</h2>
		<p>A typical install after transcribing a podcast back-catalog.</p>
	</div>
	<div class="stat-grid">
		<div class="stat-item">
			<span class="stat-label">Episodes</span>
			<span class="stat-value">142</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Transcribed</span>
			<span class="stat-value accent">138</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Total Words</span>
			<span class="stat-value purple">2.4M</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Hours</span>
			<span class="stat-value">312h</span>
		</div>
	</div>
</section>

<hr class="rule" />

<!-- CTA -->
<section class="stack">
	<h2 style="font-size:var(--fs-3);text-transform:none;letter-spacing:-0.01em;">Ready to cut your own clips?</h2>
	<p>GitSkit is self-hosted and open source. Point it at your video folder and start in minutes.</p>
	<div class="row">
		<a href="/how-to" class="btn btn-primary">Get started</a>
		<a href="https://github.com/yusufsafary/gitskit" class="btn btn-ghost" target="_blank" rel="noopener noreferrer">View on GitHub</a>
		<a href="/login" class="btn btn-ghost">Sign in</a>
	</div>
</section>

<style>
/* ── Demo player ─────────────────────────────────────────────────────────── */
.demo-player {
	border: 1px solid var(--rule);
	border-radius: var(--radius-lg);
	background: var(--bg-2);
	padding: 1.5rem;
	display: grid;
	gap: 1.25rem;
}

.demo-badge {
	font-size: var(--fs-small);
	font-family: var(--font-mono);
	color: var(--accent);
	letter-spacing: 0.08em;
}

.demo-waveform {
	display: flex;
	align-items: flex-end;
	gap: 3px;
	height: 52px;
}

.demo-bar {
	flex: 1;
	height: var(--h);
	background: var(--accent);
	border-radius: 2px;
	opacity: 0.55;
	min-width: 0;
}

.demo-stats {
	display: flex;
	gap: 1.5rem;
	flex-wrap: wrap;
}

.demo-stat-item {
	display: flex;
	flex-direction: column;
	gap: 0.1rem;
}

.demo-num {
	font-family: var(--font-mono);
	font-weight: 700;
	font-size: 1.125rem;
	color: var(--ink);
	line-height: 1.2;
}

.demo-label {
	font-size: var(--fs-small);
	color: var(--muted);
}

/* ── Feature grid ────────────────────────────────────────────────────────── */
.features-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: 1fr;
}

@media (min-width: 640px) {
	.features-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

.feature-card {
	border: 1px solid var(--rule);
	border-radius: var(--radius-lg);
	padding: 1.25rem;
	background: var(--bg-2);
	display: grid;
	gap: 0.75rem;
}

.feature-top {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.feature-top h3 {
	font-size: var(--fs-4);
	text-transform: none;
	letter-spacing: 0;
	font-weight: 700;
	line-height: 1;
}

.feature-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	border-radius: var(--radius);
	flex-shrink: 0;
}

.accent-green  { color: var(--accent);   background: rgba(110,255,87,0.1); }
.accent-purple { color: var(--accent-2); background: rgba(168,85,247,0.1); }
.accent-cyan   { color: var(--accent-3); background: rgba(0,200,255,0.1); }

.feature-card p {
	font-size: var(--fs-small);
	color: var(--ink-dim);
	max-width: none;
}

.feature-demo {
	background: var(--bg-3);
	border: 1px solid var(--rule);
	border-radius: var(--radius);
	padding: 0.875rem;
	display: grid;
	gap: 0.75rem;
}

/* ── Supercut demo ───────────────────────────────────────────────────────── */
.demo-query {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.demo-query code {
	font-family: var(--font-mono);
	font-size: var(--fs-small);
	color: var(--accent);
}

.clip-timeline {
	display: grid;
	gap: 0.4rem;
}

.clip-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.clip-label {
	font-size: 0.65rem;
	font-family: var(--font-mono);
	color: var(--muted);
	min-width: 3rem;
	flex-shrink: 0;
}

.clips {
	display: flex;
	gap: 3px;
	align-items: center;
	flex-wrap: nowrap;
	overflow: hidden;
}

.clip {
	height: 14px;
	width: var(--w);
	background: var(--bg);
	border-radius: 2px;
	opacity: 0.75;
	flex-shrink: 0;
	background-color: var(--bg);
	background: var(--bg);
}

/* inline style sets --bg but we need background */
.clip { background: var(--bg) }

/* ── Sentence builder ────────────────────────────────────────────────────── */
.words-grid {
	display: flex;
	gap: 0.4rem;
	flex-wrap: wrap;
}

.word-chip {
	border: 1px solid var(--c);
	border-radius: var(--radius);
	padding: 0.25rem 0.5rem;
	display: grid;
	gap: 0.05rem;
}

.word-text {
	font-weight: 700;
	font-size: var(--fs-small);
	color: var(--c);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.word-src {
	font-size: 0.6rem;
	color: var(--muted);
	font-family: var(--font-mono);
}

.arrow-row {
	display: flex;
	align-items: center;
	gap: 0.4rem;
}

/* ── Melody ──────────────────────────────────────────────────────────────── */
.melody {
	display: flex;
	align-items: flex-end;
	gap: 5px;
	height: 72px;
}

.melody-bar {
	flex: 1;
	height: var(--mh);
	background: var(--accent-3);
	border-radius: 2px;
	opacity: 0.75;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	min-width: 0;
}

.note-label {
	font-size: 0.55rem;
	font-family: var(--font-mono);
	color: var(--bg);
	font-weight: 700;
	padding-block-start: 3px;
}

/* ── Transcript ──────────────────────────────────────────────────────────── */
.transcript-words {
	display: flex;
	gap: 0.4rem;
	flex-wrap: wrap;
	align-items: center;
}

.transcript-chip {
	display: grid;
	gap: 0.1rem;
	background: var(--bg);
	border: 1px solid var(--rule);
	border-radius: var(--radius);
	padding: 0.25rem 0.5rem;
}

.t-word {
	font-weight: 600;
	font-size: var(--fs-small);
	color: var(--ink);
}

.t-ts {
	font-size: 0.6rem;
	font-family: var(--font-mono);
	color: var(--accent);
}

/* ── Small screen tweaks ─────────────────────────────────────────────────── */
@media (max-width: 480px) {
	.demo-player {
		padding: 1rem;
	}
	.demo-stats {
		gap: 1rem;
	}
	.feature-card {
		padding: 1rem;
	}
	.demo-num {
		font-size: 1rem;
	}
}
</style>
