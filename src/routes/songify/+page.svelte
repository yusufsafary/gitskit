<script lang="ts">
import BucketPicker from '$lib/BucketPicker.svelte';
import JobPanel from '$lib/JobPanel.svelte';

let target = $state('');
let melody = $state('');
let buckets = $state<string[]>([]);
let useSingleClip = $state(false);
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
				kind: 'songify',
				target: target.trim(),
				melody: melody.trim() || undefined,
				buckets: buckets.length > 0 ? buckets : null,
				singleClip: useSingleClip
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
	<title>Songify — GitSkit</title>
	<meta name="description" content="Detect pitch in video clips and arrange them into a melody. Turn any transcript into a song with GitSkit." />
	<link rel="canonical" href="https://gitskit.xyz/songify" />
</svelte:head>

<section class="hero">
	<span class="tag tag-blue">Audio</span>
	<h1>Make them <mark>sing</mark>.</h1>
	<p>Detect pitch in clips with aubiopitch and arrange them into a melody. Turn any transcript into a song.</p>
</section>

<section class="split">
	<form class="stack" onsubmit={submit}>
		<div class="field">
			<label for="target">Word or phrase to search</label>
			<input
				id="target"
				type="text"
				bind:value={target}
				placeholder="e.g. yeah, hello, actually…"
				required
			/>
		</div>

		<div class="field">
			<label for="melody">Melody (note names, optional)</label>
			<input
				id="melody"
				type="text"
				bind:value={melody}
				placeholder="e.g. C4 E4 G4 C5…"
				style="font-family:var(--font-mono);"
			/>
			<p style="font-size:var(--fs-xs);color:var(--muted);font-family:var(--font-mono);">
				Space-separated note names (C4, D4, E4…). Leave blank to auto-arrange by pitch.
			</p>
		</div>

		<BucketPicker bind:selected={buckets} />

		<label class="field-check">
			<input type="checkbox" bind:checked={useSingleClip} />
			Single clip per note (no looping)
		</label>

		<button
			type="submit"
			class="btn btn-primary"
			disabled={submitting || !target.trim()}
		>
			{#if submitting}
			<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.3);border-top-color:#080808;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
			Songifying…
			{:else}
			🎵 Songify →
			{/if}
		</button>
	</form>

	<div>
		{#if jobId}
		<JobPanel {jobId} />
		{:else}
		<div class="card stack">
			<p class="caps muted">How it works</p>
			<p>GitSkit finds all clips of your target word/phrase, uses <code>aubiopitch</code> to detect the fundamental frequency of each clip, then arranges them to match your melody (or auto-sorts by pitch).</p>
			<p style="margin-top:-0.5rem;">Works best with single syllable words that have clear, sustained vowel sounds.</p>
		</div>
		{/if}
	</div>
</section>

<style>
@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
