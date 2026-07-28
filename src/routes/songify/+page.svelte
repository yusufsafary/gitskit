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
	<title>Songify - GitSkit | Turn Transcripts Into Melodies</title>
	<meta name="description" content="Detect pitch in video clips and arrange them into a melody. Turn any transcript into a song with GitSkit." />
	<link rel="canonical" href="https://gitskit.xyz/songify" />
</svelte:head>

<section class="hero">
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
				placeholder="e.g. yeah, hello, or actually"
				required
			/>
		</div>

		<div class="field">
			<label for="melody">Melody (note sequence)</label>
			<input
				id="melody"
				type="text"
				bind:value={melody}
				placeholder="e.g. C4 E4 G4 C5 or leave blank for auto"
			/>
			<p style="font-size:var(--fs-small);color:var(--muted);">Scientific notation (C4, D4, E4...). Leave blank to let the algorithm arrange clips by natural pitch.</p>
		</div>

		<BucketPicker bind:selected={buckets} help="Clips from all selected buckets are candidates." />

		<div class="field">
			<label class="field-check">
				<input type="checkbox" bind:checked={useSingleClip} />
				Use a single clip (pitch-shift to each note)
			</label>
		</div>

		<div>
			<button type="submit" class="btn btn-primary" disabled={submitting}>
				{submitting ? 'Starting...' : 'Songify'}
			</button>
		</div>
	</form>

	<div>
		<JobPanel {jobId} />
	</div>
</section>
