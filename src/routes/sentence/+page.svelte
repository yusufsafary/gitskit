<script lang="ts">
import BucketPicker from '$lib/BucketPicker.svelte';
import JobPanel from '$lib/JobPanel.svelte';

let sentence = $state('');
let buckets = $state<string[]>([]);
let fixedSeed = $state(false);
let seed = $state(42);
let debug = $state(false);
let submitting = $state(false);
let jobId = $state<string | null>(null);

async function submit(e: SubmitEvent) {
	e.preventDefault();
	submitting = true;
	jobId = null;
	try {
		const res = await fetch('/api/jobs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'sentence',
				sentence: sentence.trim(),
				buckets: buckets.length > 0 ? buckets : null,
				seed: fixedSeed ? seed : undefined,
				debug
			})
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
	<title>Sentence Builder — GitSkit</title>
	<meta name="description" content="Pick one clip per word from transcripts and stitch them together. Build any sentence from your video library." />
	<link rel="canonical" href="https://gitskit.xyz/sentence" />
</svelte:head>

<section class="hero">
	<span class="tag tag-accent">Builder</span>
	<h1>They never said <mark>that</mark>.</h1>
	<p>Pick one clip per word and stitch them together. Make anyone say anything.</p>
</section>

<section class="split">
	<form class="stack" onsubmit={submit}>
		<div class="field">
			<label for="sentence">Sentence to build</label>
			<textarea
				id="sentence"
				bind:value={sentence}
				placeholder="Type any sentence…"
				required
				style="min-height:6rem;"
			></textarea>
			<p style="font-size:var(--fs-xs);color:var(--muted);font-family:var(--font-mono);">
				One clip per word · use common words for best results
			</p>
		</div>

		<BucketPicker bind:selected={buckets} help="More buckets = more word candidates." />

		<div class="stack-tight">
			<label class="field-check">
				<input type="checkbox" bind:checked={fixedSeed} />
				Fixed seed (reproducible results)
			</label>
			{#if fixedSeed}
			<div class="field">
				<label for="seed">Seed value</label>
				<input id="seed" type="number" bind:value={seed} min="0" style="max-width:8rem;" />
			</div>
			{/if}
			<label class="field-check">
				<input type="checkbox" bind:checked={debug} />
				Debug overlay (burn word onto frame)
			</label>
		</div>

		<button
			type="submit"
			class="btn btn-primary"
			disabled={submitting || !sentence.trim()}
		>
			{#if submitting}
			<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.3);border-top-color:#080808;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
			Building…
			{:else}
			Build sentence →
			{/if}
		</button>
	</form>

	<div>
		{#if jobId}
		<JobPanel {jobId} />
		{:else}
		<div class="card stack">
			<p class="caps muted">How it works</p>
			<p>For each word in your sentence, GitSkit finds the best matching clip from your transcripts and stitches them together. The more videos you have, the better the results.</p>
			<p style="margin-top:-0.5rem;">Uses <code>sed</code>-style phonetic matching — so "they" might match "they'd" or "they'll" — which can actually improve the effect.</p>
		</div>
		{/if}
	</div>
</section>

<style>
@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
