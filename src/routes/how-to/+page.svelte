<svelte:head>
	<title>How To Use GitSkit - Setup Guide</title>
	<meta name="description" content="Step-by-step guide to setting up GitSkit. Clone the repo, configure your environment, add your videos, and start building supercuts." />
	<link rel="canonical" href="https://gitscity.xyz/how-to" />
</svelte:head>

<section class="hero">
	<h1>How To <mark>use</mark> GitSkit.</h1>
	<p>Everything you need to get from zero to your first supercut, step by step.</p>
</section>

<hr class="rule" />

<section class="split">
	<div class="stack">
		<h2 style="font-size:var(--fs-3);text-transform:none;letter-spacing:-0.01em;">Setup</h2>

		<div class="step-grid">
			<div class="step-item">
				<div class="step-num">01</div>
				<div class="prose stack-tight">
					<h4>Clone and install</h4>
					<p>Clone the GitSkit repo and install dependencies.</p>
					<pre>git clone https://github.com/yusufsafary/gitskit
cd gitskit
npm install</pre>
				</div>
			</div>

			<div class="step-item">
				<div class="step-num">02</div>
				<div class="prose stack-tight">
					<h4>Configure environment</h4>
					<p>Copy the example env file and fill in your values.</p>
					<pre>cp .env.example .env</pre>
					<p>Edit <code>.env</code> with your <code>GITSKIT_SECRET</code> and optionally your <code>XAI_API_KEY</code> for transcription.</p>
				</div>
			</div>

			<div class="step-item">
				<div class="step-num">03</div>
				<div class="prose stack-tight">
					<h4>Add your videos</h4>
					<p>Create the bucket structure and drop in your media files.</p>
					<pre>videos/
  my-podcast/
    videos/     &lt;- put .mp4 / .mp3 files here
    transcripts/
    supercuts/</pre>
				</div>
			</div>

			<div class="step-item">
				<div class="step-num">04</div>
				<div class="prose stack-tight">
					<h4>Run GitSkit</h4>
					<p>Start the dev server and open it in your browser.</p>
					<pre>npm run dev</pre>
				</div>
			</div>
		</div>
	</div>

	<div class="stack">
		<h2 style="font-size:var(--fs-3);text-transform:none;letter-spacing:-0.01em;">Environment variables</h2>

		<div class="card stack-tight">
			{#each [
				['GITSKIT_SECRET', 'Yes', 'Random 32+ char secret for signing sessions'],
				['GITSKIT_PASSWORD', 'No', 'Password to protect access (empty = open)'],
				['XAI_API_KEY', 'For transcription', 'API key from x.ai'],
				['SYNTAX_BUCKETS_DIR', 'No', 'Absolute path to your videos root'],
			] as [key, req, desc]}
				<div style="display:grid;gap:0.2rem;border-block-end:1px solid var(--rule);padding-block:0.75rem;">
					<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
						<code style="font-size:var(--fs-small);color:var(--accent);">{key}</code>
						<span class="tag {req === 'Yes' ? 'tag-accent' : 'tag'}" style="font-size:0.65rem;">{req}</span>
					</div>
					<span style="font-size:var(--fs-small);color:var(--ink-dim);">{desc}</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<hr class="rule" />

<section class="split">
	<div class="stack prose">
		<h2>Transcription</h2>
		<p>Once your videos are in place, head to the Transcribe page and queue up your files. GitSkit sends audio to xAI's speech-to-text API and saves word-level JSON transcripts alongside your media.</p>
		<p>Transcription is one-time per file. Re-transcribing overwrites the existing transcript.</p>
	</div>
	<div class="stack prose">
		<h2>Building supercuts</h2>
		<p>Go to the Supercut page. Enter a word, phrase, or regex pattern. GitSkit searches all transcripts, slices the matching clips from the source video using FFmpeg, and stitches them into a single output file.</p>
		<p>The rendered clip appears in your Clips library and can be downloaded or deleted.</p>
	</div>
</section>

<hr class="rule" />

<section class="stack">
	<h2 style="font-size:var(--fs-3);text-transform:none;letter-spacing:-0.01em;">Deploy to Vercel</h2>
	<p>GitSkit is designed to deploy to Vercel. Set your environment variables in the Vercel dashboard and push your repo.</p>
	<pre style="max-width:none;overflow-x:auto;background:var(--bg-2);border:1px solid var(--rule);border-radius:var(--radius);padding:1rem;font-size:var(--fs-small);">vercel --prod</pre>
	<div class="row">
		<a href="https://vercel.com/new" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Deploy on Vercel</a>
		<a href="/demo" class="btn btn-ghost">See a demo</a>
	</div>
</section>

<style>
.step-grid {
	display: grid;
	gap: 2rem;
}
.step-item {
	display: grid;
	grid-template-columns: 3rem 1fr;
	gap: 1rem;
	align-items: start;
}
.step-num {
	font-size: 2rem;
	font-weight: 700;
	font-family: var(--font-mono);
	color: var(--accent);
	line-height: 1;
}
pre {
	background: var(--bg-2);
	border: 1px solid var(--rule);
	border-radius: var(--radius);
	padding: 0.875rem 1rem;
	font-family: var(--font-mono);
	font-size: var(--fs-small);
	overflow-x: auto;
	color: var(--ink-dim);
	max-width: 100%;
}
code { font-family: var(--font-mono); }
@media (max-width: 480px) {
	.step-item { grid-template-columns: 2.5rem 1fr; }
}
</style>
