<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function hours(sec: number): string {
		const h = (sec / 3600).toFixed(1);
		return h;
	}
</script>

<svelte:head>
	<title>Stats - GitSkit | Word Frequency Across Your Library</title>
	<meta name="description" content="Top words, bigrams, and trigrams across all your transcribed video buckets." />
	<link rel="canonical" href="https://gitskit.xyz/stats" />
</svelte:head>

<section class="hero">
	<h1><mark>Stats</mark>.</h1>
	<p>
		{data.totalFiles} transcripts, {data.totalWords.toLocaleString()} words,
		{hours(data.totalDurationSec)} hours of audio.
	</p>
</section>

<section>
	<div class="stat-grid">
		<div class="stat-item">
			<span class="stat-label">Transcripts</span>
			<span class="stat-value">{data.totalFiles}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Total words</span>
			<span class="stat-value accent">{data.totalWords.toLocaleString()}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Total hours</span>
			<span class="stat-value purple">{hours(data.totalDurationSec)}h</span>
		</div>
	</div>
</section>

<hr class="rule" />

<section class="split">
	<div class="stack">
		<h3>Top words</h3>
		{#if data.top1.length === 0}
			<p class="muted" style="font-size:var(--fs-small);">No data yet. Transcribe some videos first.</p>
		{:else}
			<ol class="stack-tight" style="padding:0;list-style:none;font-variant-numeric:tabular-nums;">
				{#each data.top1 as item, i (item.phrase)}
					<li class="row" style="gap:1rem;border-block-end:1px solid var(--rule);padding-block:0.5rem;">
						<span class="caps muted" style="min-inline-size:2.5rem;">{i + 1}</span>
						<span style="flex:1;font-weight:600;font-size:var(--fs-small);">{item.phrase}</span>
						<span class="tag tag-accent">{item.count.toLocaleString()}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	<div class="stack">
		<h3>Top 2-grams</h3>
		{#if data.top2.length === 0}
			<p class="muted" style="font-size:var(--fs-small);">No data yet.</p>
		{:else}
			<ol class="stack-tight" style="padding:0;list-style:none;font-variant-numeric:tabular-nums;">
				{#each data.top2 as item, i (item.phrase)}
					<li class="row" style="gap:1rem;border-block-end:1px solid var(--rule);padding-block:0.5rem;">
						<span class="caps muted" style="min-inline-size:2.5rem;">{i + 1}</span>
						<span style="flex:1;font-weight:600;font-size:var(--fs-small);">{item.phrase}</span>
						<span class="tag tag-purple">{item.count.toLocaleString()}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>

<section class="split">
	<div class="stack">
		<h3>Top 3-grams</h3>
		{#if data.top3.length === 0}
			<p class="muted" style="font-size:var(--fs-small);">No data yet.</p>
		{:else}
			<ol class="stack-tight" style="padding:0;list-style:none;font-variant-numeric:tabular-nums;">
				{#each data.top3 as item, i (item.phrase)}
					<li class="row" style="gap:1rem;border-block-end:1px solid var(--rule);padding-block:0.5rem;">
						<span class="caps muted" style="min-inline-size:2.5rem;">{i + 1}</span>
						<span style="flex:1;font-weight:600;font-size:var(--fs-small);">{item.phrase}</span>
						<span class="tag tag-blue">{item.count.toLocaleString()}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	<div class="stack">
		<h3>Top 4-grams</h3>
		{#if data.top4.length === 0}
			<p class="muted" style="font-size:var(--fs-small);">No data yet.</p>
		{:else}
			<ol class="stack-tight" style="padding:0;list-style:none;font-variant-numeric:tabular-nums;">
				{#each data.top4 as item, i (item.phrase)}
					<li class="row" style="gap:1rem;border-block-end:1px solid var(--rule);padding-block:0.5rem;">
						<span class="caps muted" style="min-inline-size:2.5rem;">{i + 1}</span>
						<span style="flex:1;font-weight:600;font-size:var(--fs-small);">{item.phrase}</span>
						<span class="tag">{item.count.toLocaleString()}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>
