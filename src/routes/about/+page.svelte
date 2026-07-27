<svelte:head>
	<title>About GitSkit - Video Transcript Supercut Studio</title>
	<meta name="description" content="GitSkit is a self-hosted video transcript supercut studio. Cut, clip, and command your media library with word-level precision." />
	<link rel="canonical" href="https://gitscity.xyz/about" />
</svelte:head>

<section class="hero">
	<h1>About <mark>GitSkit</mark>.</h1>
	<p>Cut. Clip. Command. A local-first video transcript studio for creators who move fast.</p>
</section>

<hr class="rule" />

<section class="split">
	<div class="prose stack">
		<h2>What is GitSkit?</h2>
		<p>
			GitSkit is a self-hosted studio for building video supercuts from word-level transcripts.
			You point it at a folder of videos, it transcribes them using xAI's speech-to-text API,
			and then you can search, remix, and render clips with surgical precision.
		</p>
		<p>
			Whether you want to find every time a speaker said "actually," build a sentence they never
			said, or turn their voice into a melody, GitSkit handles it fast, locally, and without
			sending your videos anywhere.
		</p>
	</div>

	<div class="stack">
		<div class="card">
			<p class="caps muted" style="margin-block-end:0.75rem;">Core features</p>
			<ul style="list-style:none;padding:0;display:grid;gap:0.75rem;">
				{#each [
					['Supercut', 'Clip every match of a phrase, regex, or AI-generated pattern'],
					['Sentence builder', 'Pick one clip per word to build anything from scratch'],
					['Songify', 'Detect pitch and arrange clips into a melody'],
					['Transcription', 'Word-level transcription via xAI speech-to-text'],
					['Stats', 'Top words, bigrams, and trigrams across all buckets'],
					['Clip library', 'Browse, preview, and download every rendered output'],
				] as [name, desc]}
					<li style="display:grid;gap:0.2rem;">
						<span style="font-weight:600;font-size:var(--fs-small);color:var(--accent);">{name}</span>
						<span style="font-size:var(--fs-small);color:var(--ink-dim);">{desc}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<hr class="rule" />

<section class="split">
	<div class="prose stack">
		<h2>Built for speed</h2>
		<p>
			GitSkit was built on top of Wes Bos's Syntax Supercut Studio, reimagined with a faster
			interface, multi-chain Solana wallet authentication, and a design system built for extended
			creative sessions.
		</p>
		<p>
			Everything runs locally. Your videos, your transcripts, your renders. The only external
			service is xAI for speech-to-text, and that's optional if you bring your own transcripts.
		</p>
	</div>

	<div class="prose stack">
		<h2>Technology</h2>
		<ul>
			<li>SvelteKit for the full-stack framework</li>
			<li>FFmpeg for all video operations</li>
			<li>xAI speech-to-text for word-level transcription</li>
			<li>aubiopitch for melody pitch detection</li>
			<li>Solana Wallet Standard for multichain wallet authentication</li>
			<li>Vercel for cloud deployment</li>
		</ul>
	</div>
</section>

<hr class="rule" />

<section class="stack">
	<h2 style="font-size:var(--fs-3);text-transform:none;letter-spacing:-0.01em;">Ready to start?</h2>
	<div class="row">
		<a href="/how-to" class="btn btn-primary">Read the setup guide</a>
		<a href="/demo" class="btn btn-ghost">View demo</a>
		<a href="/login" class="btn btn-ghost">Sign in</a>
	</div>
</section>
