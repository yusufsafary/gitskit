<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import BucketPicker from '$lib/BucketPicker.svelte';
	import JobPanel from '$lib/JobPanel.svelte';

	let { data }: { data: PageData } = $props();

	const jobId = $derived($page.url.searchParams.get('job'));
	let buckets = $state<string[]>([]);
	let submitting = $state(false);

	const missingInScope = $derived(
		data.missing.filter((m) => buckets.length === 0 || buckets.includes(m.bucket)).length
	);

	const grouped = $derived.by(() => {
		const inScope = (m: (typeof data.missing)[number]) =>
			buckets.length === 0 || buckets.includes(m.bucket);
		const map = new Map<string, typeof data.missing>();
		for (const m of data.missing) {
			if (!inScope(m)) continue;
			if (!map.has(m.bucket)) map.set(m.bucket, []);
			map.get(m.bucket)!.push(m);
		}
		return [...map.entries()].map(([name, items]) => ({ name, items }));
	});

	async function transcribeOne(bucket: string, slug: string) {
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
		goto(`/transcribe?job=${id}`, { keepFocus: true });
	}

	async function transcribeAll() {
		if (!missingInScope) return;
		const label = buckets.length ? buckets.join(', ') : 'all buckets';
		if (!confirm(`Transcribe ${missingInScope} missing file${missingInScope === 1 ? '' : 's'} across ${label}?`)) return;

		submitting = true;
		try {
			const res = await fetch('/api/jobs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind: 'transcribe-all', buckets })
			});
			if (!res.ok) {
				const { message } = await res.json().catch(() => ({ message: 'error' }));
				alert(`Failed: ${message}`);
				return;
			}
			const { id } = await res.json();
			goto(`/transcribe?job=${id}`, { keepFocus: true });
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Transcribe - GitSkit | Word-Level Video Transcription</title>
	<meta name="description" content="Transcribe your videos with xAI speech-to-text. Get precise word-level timestamps for every clip in your library." />
	<link rel="canonical" href="https://gitscity.xyz/transcribe" />
</svelte:head>

<section class="hero">
	<h1><mark>Transcribe</mark>.</h1>
	<p>
		Send audio to xAI's speech-to-text API and store word-level transcripts.
		{data.transcribedCount} transcribed; {data.missing.length} missing across {data.buckets.length}
		bucket{data.buckets.length === 1 ? '' : 's'}.
	</p>
</section>

<section class="split">
	<div class="stack">
		<BucketPicker
			bind:selected={buckets}
			label="Scope"
			help="Select buckets to scope the 'transcribe all missing' action."
		/>

		{#if missingInScope > 0}
			<div>
				<button
					type="button"
					class="btn btn-primary"
					onclick={transcribeAll}
					disabled={submitting}
				>
					{submitting ? 'Starting...' : `Transcribe all ${missingInScope} missing`}
				</button>
			</div>
		{:else}
			<p class="muted" style="font-size:var(--fs-small);">No missing transcripts in the selected scope.</p>
		{/if}

		{#if grouped.length > 0}
			<div class="stack">
				<h3 style="font-size:1rem;text-transform:none;font-weight:600;color:var(--ink-dim);">
					Missing transcripts
				</h3>
				{#each grouped as group (group.name)}
					<div class="stack-tight">
						<p class="caps" style="color:var(--muted);">{group.name} ({group.items.length})</p>
						{#each group.items as item (item.slug)}
							<div class="row" style="justify-content:space-between;padding:0.5rem 0;border-block-end:1px solid var(--rule);">
								<div>
									<span class="mono" style="font-size:var(--fs-small);">{item.slug}</span>
									{#if item.hasMp3}
										<span class="tag tag-blue" style="margin-inline-start:0.4rem;">mp3</span>
									{/if}
									<span class="muted" style="font-size:0.7rem;margin-inline-start:0.5rem;">{item.sizeMB} MB</span>
								</div>
								<button
									type="button"
									class="btn btn-small btn-primary"
									onclick={() => transcribeOne(item.bucket, item.slug)}
								>
									Transcribe
								</button>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div>
		<JobPanel {jobId} />
	</div>
</section>
