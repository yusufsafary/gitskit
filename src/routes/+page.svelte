<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let filter = $state('');
	let showOnlyMissing = $state(false);
	let activeBucket = $state<string>('all');

	const buckets = $derived(['all', ...data.groups.map((g) => g.name)]);

	const filteredGroups = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		return data.groups
			.filter((g) => activeBucket === 'all' || g.name === activeBucket)
			.map((g) => ({
				name: g.name,
				rows: g.rows.filter((r) => {
					if (showOnlyMissing && r.hasTranscript) return false;
					if (!q) return true;
					return r.slug.toLowerCase().includes(q);
				})
			}));
	});

	function formatDuration(sec: number): string {
		if (!sec || sec <= 0) return '--';
		const h = Math.floor(sec / 3600);
		const m = Math.floor((sec % 3600) / 60);
		const s = Math.floor(sec % 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m ${s}s`;
	}

	async function transcribe(bucket: string, slug: string) {
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
		goto(`/transcribe?job=${id}`);
	}

	async function del(bucket: string, slug: string) {
		if (
			!confirm(
				`Delete all files for ${bucket}/${slug}?\n\nThis removes the video, audio, and transcript and cannot be undone.`
			)
		)
			return;
		const res = await fetch(
			`/api/library/${encodeURIComponent(bucket)}/${encodeURIComponent(slug)}`,
			{ method: 'DELETE' }
		);
		if (!res.ok) {
			const { message } = await res.json().catch(() => ({ message: 'error' }));
			alert(`Failed: ${message}`);
			return;
		}
		await invalidateAll();
	}

	const totalHours = $derived(data.totals.totalDurationSec / 3600);
</script>

<svelte:head>
	<title>GitSkit - Cut. Clip. Command. | Video Transcript Supercut Studio</title>
	<meta name="description" content="GitSkit is a self-hosted video transcript supercut studio. Transcribe videos with xAI, search word-level clips, and render supercuts with surgical precision." />
	<link rel="canonical" href="https://gitscity.xyz/" />
</svelte:head>

<section class="hero">
	<h1>The <mark>Library</mark>.</h1>
	<p>Every video, its <code>.mp3</code> audio, and word-level transcript, grouped by bucket.</p>
	<div style="margin-top:1.25rem;">
		<a href="https://orynth.dev/projects/gitskit" target="_blank" rel="noopener">
			<img src="https://orynth.dev/api/badge/gitskit?theme=light&style=default" alt="Featured on Orynth" width="260" height="80" />
		</a>
	</div>
</section>

<section>
	<div class="stat-grid">
		<div class="stat-item">
			<span class="stat-label">Buckets</span>
			<span class="stat-value">{data.groups.length}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Videos</span>
			<span class="stat-value">{data.totals.videos}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Transcribed</span>
			<span class="stat-value accent">{data.totals.transcribed}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Total words</span>
			<span class="stat-value purple">{data.totals.totalWords.toLocaleString()}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Total runtime</span>
			<span class="stat-value blue">{totalHours.toFixed(1)}h</span>
		</div>
	</div>
</section>

<section class="stack">
	<div class="row" style="justify-content:space-between;gap:1rem;flex-wrap:wrap;">
		<div class="row" style="gap:0.5rem;flex-wrap:wrap;">
			{#each buckets as b (b)}
				<button
					type="button"
					class="btn btn-small"
					class:btn-primary={activeBucket === b}
					class:btn-ghost={activeBucket !== b}
					onclick={() => (activeBucket = b)}
				>
					{b}
				</button>
			{/each}
		</div>
		<div class="row" style="gap:1rem;flex-wrap:wrap;">
			<input
				type="search"
				placeholder="Filter by slug..."
				bind:value={filter}
				style="max-width:24rem;"
			/>
			<label class="field-check">
				<input type="checkbox" bind:checked={showOnlyMissing} />
				Only missing transcripts
			</label>
			<button class="btn btn-small btn-ghost" onclick={() => invalidateAll()}>Refresh</button>
		</div>
	</div>
</section>

{#each filteredGroups as group (group.name)}
	<section class="stack">
		<div class="row" style="justify-content:space-between;">
			<h3>{group.name}</h3>
			<span class="tag">{group.rows.length} videos</span>
		</div>
		<hr class="rule" />
		{#if group.rows.length === 0}
			<p class="muted" style="font-size:var(--fs-small);">No videos match the current filter.</p>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Slug</th>
							<th>MP3</th>
							<th>Words</th>
							<th>Duration</th>
							<th>Size</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each group.rows as row (row.slug)}
							<tr>
								<td>
									<span class="mono" style="font-size:var(--fs-small);">{row.slug}</span>
									{#if row.hasTranscript}
										<span class="tag tag-accent" style="margin-inline-start:0.5rem;">transcribed</span>
									{/if}
								</td>
								<td>
									{#if row.hasAudio}
										<span class="tag tag-blue">yes</span>
									{:else}
										<span class="muted">--</span>
									{/if}
								</td>
								<td>{row.wordCount > 0 ? row.wordCount.toLocaleString() : '--'}</td>
								<td>{formatDuration(row.durationSec)}</td>
								<td>{row.sizeMB !== null ? `${row.sizeMB} MB` : '--'}</td>
								<td>
									<div class="row" style="gap:0.5rem;">
										{#if !row.hasTranscript}
											<button
												type="button"
												class="btn btn-small btn-primary"
												onclick={() => transcribe(group.name, row.slug)}
											>
												Transcribe
											</button>
										{/if}
										<button
											type="button"
											class="btn btn-small btn-danger"
											onclick={() => del(group.name, row.slug)}
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
{/each}

{#if data.groups.length === 0}
	<section class="card" style="text-align:center;padding:3rem;">
		<h2 style="font-size:var(--fs-3);margin-block-end:1rem;">No buckets found</h2>
		<p>
			Create a folder under <code>videos/</code> (in the project root) with a <code>videos/</code>
			subfolder inside to get started. Or set <code>SYNTAX_BUCKETS_DIR</code> to point to your media
			directory.
		</p>
		<a href="/how-to" class="btn btn-primary" style="margin-block-start:1.5rem;display:inline-flex;">
			Read the setup guide
		</a>
	</section>
{/if}
