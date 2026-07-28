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
	<title>Sentence Builder - GitSkit | Make Anyone Say Anything</title>
	<meta name="description" content="Pick one clip per word from transcripts and stitch them together. Build any sentence from your video library." />
	<link rel="canonical" href="https://gitskit.xyz/sentence" />
</svelte:head>

<section class="hero">
	<h1>They never said <mark>that</mark>.</h1>
	<p>Pick one clip per word and stitch them together. Make anyone say anything.</p>
</section>

<section class="split">
	<form class="stack" onsubmit={submit}>
		<div class="field">
			<label for="sentence">Sentence</label>
			<textarea
				id="sentence"
				bind:value={sentence}
				placeholder="Type any sentence..."
				required
			></textarea>
			<p style="font-size:var(--fs-small);color:var(--muted);">One clip per word will be selected from transcripts. Use common words for best results.</p>
		</div>

		<BucketPicker bind:selected={buckets} help="More buckets means more word candidates." />

		<div class="stack-tight">
			<div class="field">
				<label class="field-check">
					<input type="checkbox" bind:checked={fixedSeed} />
					Use fixed seed (reproducible results)
				</label>
				{#if fixedSeed}
					<input type="number" bind:value={seed} min="0" style="max-width:8rem;" />
				{/if}
			</div>
			<label class="field-check">
				<input type="checkbox" bind:checked={debug} />
				Debug overlay (burn word onto frame)
			</label>
		</div>

		<div>
			<button type="submit" class="btn btn-primary" disabled={submitting || !sentence.trim()}>
				{submitting ? 'Starting...' : 'Build sentence'}
			</button>
		</div>
	</form>

	<div>
		<JobPanel {jobId} />
	</div>
</section>
