<script lang="ts">
import BucketPicker from '$lib/BucketPicker.svelte';
import JobPanel from '$lib/JobPanel.svelte';

const MODES = ['phrase', 'regex', 'ai'] as const;
let mode = $state<'phrase' | 'regex' | 'ai'>('phrase');
let target = $state('');
let regexSrc = $state('');
let aiPrompt = $state('');
let aiRegex = $state('');
let aiApproved = $state(false);
let aiBusy = $state(false);
let tile = $state(false);
let debug = $state(false);
let dryRun = $state(false);
let useLimit = $state(false);
let limit = $state(50);
let buckets = $state<string[]>([]);
let submitting = $state(false);
let jobId = $state<string | null>(null);

async function generateRegex() {
	if (!aiPrompt.trim()) return;
	aiBusy = true;
	aiRegex = '';
	aiApproved = false;
	try {
		const res = await fetch('/api/regex-suggest', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt: aiPrompt, buckets })
		});
		if (!res.ok) {
			const { message } = await res.json().catch(() => ({ message: 'failed' }));
			alert(`AI failed: ${message}`);
			return;
		}
		const data = await res.json();
		aiRegex = data.regex ?? '';
	} finally {
		aiBusy = false;
	}
}

async function submit(e: SubmitEvent) {
	e.preventDefault();
	submitting = true;
	jobId = null;
	let payload: Record<string, unknown> = {
		kind: 'supercut',
		tile,
		debug,
		dryRun,
		buckets: buckets.length > 0 ? buckets : null,
		limit: useLimit ? limit : null
	};
	if (mode === 'phrase') payload.target = target;
	else if (mode === 'regex') payload.regexSource = regexSrc;
	else if (mode === 'ai') payload.regexSource = aiRegex;
	try {
		const res = await fetch('/api/jobs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			const { message } = await res.json().catch(() => ({ message: 'error' }));
			alert(`Failed: ${message}`);
			return;
		}
		const { id } = await res.json();
		jobId = id;
	} finally {
		submitting = false;
	}
}
</script>

<svelte:head>
	<title>Supercut — GitSkit</title>
	<meta name="description" content="Clip every match of a phrase, regex, or AI pattern across your video library. Renders supercuts from word-level transcripts." />
	<link rel="canonical" href="https://gitskit.xyz/supercut" />
</svelte:head>

<section class="hero">
	<span class="tag tag-accent">Builder</span>
	<h1><mark>Supercut</mark>.</h1>
	<p>Search transcripts by phrase, regex, or AI-generated pattern — stitch every match into one video.</p>
</section>

<section class="split">
	<form class="stack" onsubmit={submit}>

		<!-- Mode tabs -->
		<div class="field">
			<span class="caps muted">Search mode</span>
			<div class="mode-tabs">
				{#each MODES as m}
				<button
					type="button"
					class="mode-tab"
					class:active={mode === m}
					data-mode={m}
					onclick={() => { mode = m; }}
				>
					{#if m === 'phrase'}
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
					{:else if m === 'regex'}
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M8 2v12M4 6l4-4 4 4M5 10h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					{:else}
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M8 2c3.314 0 6 2.686 6 6s-2.686 6-6 6S2 11.314 2 8s2.686-6 6-6z" stroke="currentColor" stroke-width="1.5"/>
						<path d="M6 8l1.5 1.5L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					{/if}
					{m}
				</button>
				{/each}
			</div>
		</div>

		<!-- Phrase mode -->
		{#if mode === 'phrase'}
		<div class="field">
			<label for="phrase">Phrase to find</label>
			<input
				id="phrase"
				type="text"
				bind:value={target}
				placeholder="e.g. the thing is…"
				required
			/>
		</div>

		<!-- Regex mode -->
		{:else if mode === 'regex'}
		<div class="field">
			<label for="regex">Regex pattern</label>
			<input
				id="regex"
				type="text"
				bind:value={regexSrc}
				placeholder="e.g. (actually|literally|basically)"
				required
				style="font-family:var(--font-mono);font-size:0.9rem;"
			/>
			<p style="font-size:var(--fs-xs);color:var(--muted);font-family:var(--font-mono);">
				Case-insensitive · matches word-level transcript hits
			</p>
		</div>

		<!-- AI mode -->
		{:else if mode === 'ai'}
		<div class="field">
			<label for="ai-prompt">Describe what to find</label>
			<textarea
				id="ai-prompt"
				bind:value={aiPrompt}
				placeholder="e.g. moments where they sound confused or unsure…"
			></textarea>
		</div>
		{#if !aiRegex}
		<button
			type="button"
			class="btn btn-ghost"
			onclick={generateRegex}
			disabled={aiBusy || !aiPrompt.trim()}
			style="justify-self:start;"
		>
			{#if aiBusy}
			<span style="display:inline-block;width:12px;height:12px;border:1.5px solid var(--muted);border-top-color:currentColor;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
			Generating…
			{:else}
			✦ Generate regex
			{/if}
		</button>
		{/if}

		{#if aiRegex}
		<div class="panel">
			<p class="caps muted" style="margin-block-end:0.625rem;">Generated regex</p>
			<code style="display:block;font-size:0.85rem;color:var(--accent);word-break:break-all;line-height:1.5;">{aiRegex}</code>
			<label class="field-check" style="margin-block-start:1rem;">
				<input type="checkbox" bind:checked={aiApproved} required />
				I've reviewed this regex and want to use it
			</label>
		</div>
		{/if}
		{/if}

		<BucketPicker bind:selected={buckets} help="Leave all selected to search your entire library." />

		<!-- Options -->
		<div class="options-grid">
			<label class="field-check">
				<input type="checkbox" bind:checked={dryRun} />
				Dry run (preview only)
			</label>
			<label class="field-check">
				<input type="checkbox" bind:checked={tile} />
				Tile (multi-camera grid)
			</label>
			<label class="field-check">
				<input type="checkbox" bind:checked={debug} />
				Debug overlay
			</label>
			<label class="field-check">
				<input type="checkbox" bind:checked={useLimit} />
				Limit clips
				{#if useLimit}
				<input
					type="number"
					bind:value={limit}
					min="1"
					max="500"
					style="width:5rem;margin-left:0.375rem;"
				/>
				{/if}
			</label>
		</div>

		<button
			type="submit"
			class="btn btn-primary"
			disabled={submitting || (mode === 'ai' && (!aiRegex || !aiApproved))}
		>
			{#if submitting}
			<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.3);border-top-color:#080808;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
			Starting job…
			{:else}
			{dryRun ? 'Preview matches' : 'Render supercut'} →
			{/if}
		</button>
	</form>

	<div>
		{#if jobId}
		<JobPanel {jobId} />
		{:else}
		<div class="supercut-hint card" style="display:grid;gap:1rem;">
			<p class="caps muted">What is a supercut?</p>
			<p>
				A supercut clips every match of your phrase or pattern from all your videos and stitches them into one continuous video — great for detecting verbal tics, catchphrases, or thematic moments.
			</p>
			<div style="display:grid;gap:0.5rem;">
				<div class="hint-item"><span class="tag tag-accent">phrase</span> exact text match</div>
				<div class="hint-item"><span class="tag tag-blue">regex</span> pattern with alternation</div>
				<div class="hint-item"><span class="tag tag-purple">ai</span> xAI-generated pattern</div>
			</div>
		</div>
		{/if}
	</div>
</section>

<style>
.options-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.75rem;
}

@media (max-width: 480px) {
	.options-grid {
		grid-template-columns: 1fr;
	}
}

.hint-item {
	display: flex;
	align-items: center;
	gap: 0.625rem;
	font-size: var(--fs-small);
	color: var(--ink-dim);
}

@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
