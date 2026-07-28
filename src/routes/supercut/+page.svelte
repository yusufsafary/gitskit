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
	<title>Supercut - GitSkit | Build Video Supercuts From Transcripts</title>
	<meta name="description" content="Clip every match of a phrase, regex, or AI pattern across your video library. GitSkit renders supercuts from word-level transcripts in seconds." />
	<link rel="canonical" href="https://gitskit.xyz/supercut" />
</svelte:head>

<section class="hero">
	<h1><mark>Supercut</mark> builder.</h1>
	<p>Search transcripts by phrase, regex, or AI-generated pattern and stitch matching clips into a single video.</p>
</section>

<section class="split">
	<form class="stack" onsubmit={submit}>
		<div class="field">
			<span class="caps muted">Mode</span>
			<div class="row" style="gap:0.5rem;">
				{#each MODES as m}
					<button
						type="button"
						class="btn btn-small"
						class:btn-primary={mode === m}
						class:btn-ghost={mode !== m}
						onclick={() => (mode = m)}
					>
						{m}
					</button>
				{/each}
			</div>
		</div>

		{#if mode === 'phrase'}
			<div class="field">
				<label for="phrase">Phrase</label>
				<input id="phrase" type="text" bind:value={target} placeholder="e.g. the thing is..." required />
			</div>
		{:else if mode === 'regex'}
			<div class="field">
				<label for="regex">Regex pattern</label>
				<input id="regex" type="text" bind:value={regexSrc} placeholder="e.g. (actually|literally)" required />
				<p style="font-size:var(--fs-small);color:var(--muted);">Case-insensitive. Matches word-level transcript hits.</p>
			</div>
		{:else if mode === 'ai'}
			<div class="field">
				<label for="ai-prompt">Describe what to find</label>
				<textarea id="ai-prompt" bind:value={aiPrompt} placeholder="e.g. moments where they sound confused or unsure..."></textarea>
			</div>
			{#if aiRegex}
				<div class="panel">
					<p class="caps muted" style="margin-block-end:0.5rem;">Generated regex</p>
					<code style="font-family:var(--font-mono);font-size:0.85rem;color:var(--accent);word-break:break-all;">{aiRegex}</code>
					<label class="field-check" style="margin-block-start:1rem;">
						<input type="checkbox" bind:checked={aiApproved} />
						Looks good, use this regex
					</label>
				</div>
			{/if}
			<div class="row">
				<button
					type="button"
					class="btn btn-secondary btn-small"
					onclick={generateRegex}
					disabled={aiBusy || !aiPrompt.trim()}
				>
					{aiBusy ? 'Generating...' : aiRegex ? 'Regenerate' : 'Generate regex'}
				</button>
			</div>
		{/if}

		<BucketPicker bind:selected={buckets} help="Leave all selected to search every bucket." />

		<div class="stack-tight">
			<label class="field-check">
				<input type="checkbox" bind:checked={tile} />
				Tile mode (grid punchlines every few clips)
			</label>
			<label class="field-check">
				<input type="checkbox" bind:checked={debug} />
				Debug overlay (burn matched text onto frame)
			</label>
			<label class="field-check">
				<input type="checkbox" bind:checked={dryRun} />
				Dry run (count matches and estimate duration, no render)
			</label>
			<div class="field">
				<label class="field-check">
					<input type="checkbox" bind:checked={useLimit} />
					Limit number of segments
				</label>
				{#if useLimit}
					<input type="number" min="1" max="5000" bind:value={limit} style="max-width:8rem;" />
				{/if}
			</div>
		</div>

		<div>
			<button
				type="submit"
				class="btn btn-primary"
				disabled={submitting || (mode === 'ai' && (!aiRegex || !aiApproved))}
			>
				{submitting ? 'Starting...' : dryRun ? 'Dry run' : 'Run supercut'}
			</button>
		</div>
	</form>

	<div>
		<JobPanel {jobId} />
	</div>
</section>
