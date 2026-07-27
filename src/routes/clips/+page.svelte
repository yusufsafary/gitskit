<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let filter = $state('');
	let selected = $state<string | null>(null);
	let activeBucket = $state<string>('all');

	const bucketTabs = $derived(['all', ...data.buckets]);

	const filtered = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		return data.clips.filter((c) => {
			if (activeBucket !== 'all' && c.bucket !== activeBucket) return false;
			if (!q) return true;
			return c.file.toLowerCase().includes(q) || c.bucket.toLowerCase().includes(q);
		});
	});

	function mediaUrl(bucket: string, file: string): string {
		return `/api/media/${encodeURIComponent(bucket)}/supercuts/${encodeURIComponent(file)}`;
	}

	function formatDate(ms: number): string {
		return new Date(ms).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function del(bucket: string, file: string) {
		if (!confirm(`Delete ${bucket}/${file}? This cannot be undone.`)) return;
		const res = await fetch(
			`/api/clips/${encodeURIComponent(bucket)}/${encodeURIComponent(file)}`,
			{ method: 'DELETE' }
		);
		if (!res.ok) {
			alert('Failed to delete');
			return;
		}
		const key = `${bucket}::${file}`;
		if (selected === key) selected = null;
		invalidateAll();
	}
</script>

<svelte:head>
	<title>Clips Library - GitSkit | Browse Your Rendered Clips</title>
	<meta name="description" content="Browse, preview, and download every rendered clip from your GitSkit library." />
	<link rel="canonical" href="https://gitscity.xyz/clips" />
</svelte:head>

<section class="hero">
	<h1>Rendered <mark>Clips</mark>.</h1>
	<p>{data.clips.length} supercuts across {data.buckets.length} bucket{data.buckets.length === 1 ? '' : 's'}.</p>
</section>

<section class="row" style="justify-content:space-between;gap:1rem;flex-wrap:wrap;">
	<div class="row" style="gap:0.5rem;flex-wrap:wrap;">
		{#each bucketTabs as b (b)}
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
	<input type="search" placeholder="Filter clips..." bind:value={filter} style="max-width:24rem;" />
</section>

{#if filtered.length === 0}
	<section class="card" style="text-align:center;padding:2.5rem;">
		<p class="muted">{data.clips.length === 0 ? 'No clips yet. Run a supercut to generate some.' : 'No clips match your filter.'}</p>
	</section>
{:else}
	<section class="clip-grid">
		{#each filtered as clip (clip.bucket + '::' + clip.file)}
			{@const key = `${clip.bucket}::${clip.file}`}
			<div class="clip-tile">
				<button
					type="button"
					onclick={() => (selected = selected === key ? null : key)}
					style="all:unset;cursor:pointer;display:grid;gap:0.5rem;"
				>
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						src={mediaUrl(clip.bucket, clip.file)}
						preload="metadata"
						muted
						playsinline
						onmouseenter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
						onmouseleave={(e) => {
							const v = e.currentTarget as HTMLVideoElement;
							v.pause();
							v.currentTime = 0;
						}}
					></video>
					<div class="clip-tile__name">
						<span class="tag tag-purple" style="margin-inline-end:0.4em;">{clip.bucket}</span>
						{clip.file}
					</div>
					<div class="clip-tile__meta">
						<span>{clip.sizeMB} MB</span>
						<span>{formatDate(clip.modified)}</span>
					</div>
				</button>

				{#if selected === key}
					<div style="display:grid;gap:0.75rem;margin-block-start:0.75rem;">
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							controls
							src={mediaUrl(clip.bucket, clip.file)}
							style="width:100%;aspect-ratio:16/9;border-radius:var(--radius);border:1px solid var(--rule);"
						></video>
						<div class="row">
							<a class="btn btn-primary btn-small" href={mediaUrl(clip.bucket, clip.file)} download>
								Download
							</a>
							<button class="btn btn-danger btn-small" onclick={() => del(clip.bucket, clip.file)}>
								Delete
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</section>
{/if}
