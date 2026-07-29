<script lang="ts">
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

function hours(sec: number): string {
	return (sec / 3600).toFixed(1);
}
</script>

<svelte:head>
	<title>Stats — GitSkit</title>
	<meta name="description" content="Top words, bigrams, and trigrams across all your transcribed video buckets." />
	<link rel="canonical" href="https://gitskit.xyz/stats" />
</svelte:head>

<section class="hero">
	<span class="tag tag-purple">Analytics</span>
	<h1><mark>Stats</mark>.</h1>
	<p>
		{data.totalFiles} transcript{data.totalFiles !== 1 ? 's' : ''}, {data.totalWords.toLocaleString()} words, {hours(data.totalDurationSec)} hours of audio.
	</p>
</section>

<section class="stat-grid">
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
</section>

<hr class="rule" />

<section class="split">
	<div class="stack">
		<h3>Top words</h3>
		{#if data.top1.length === 0}
			<p class="muted" style="font-size:var(--fs-small);">No data yet. Transcribe some videos first.</p>
		{:else}
			<ol class="ngram-list">
				{#each data.top1 as item, i (item.phrase)}
				<li class="ngram-item">
					<span class="ngram-rank">{i + 1}</span>
					<span class="ngram-phrase">{item.phrase}</span>
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
			<ol class="ngram-list">
				{#each data.top2 as item, i (item.phrase)}
				<li class="ngram-item">
					<span class="ngram-rank">{i + 1}</span>
					<span class="ngram-phrase">{item.phrase}</span>
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
			<ol class="ngram-list">
				{#each data.top3 as item, i (item.phrase)}
				<li class="ngram-item">
					<span class="ngram-rank">{i + 1}</span>
					<span class="ngram-phrase">{item.phrase}</span>
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
			<ol class="ngram-list">
				{#each data.top4 as item, i (item.phrase)}
				<li class="ngram-item">
					<span class="ngram-rank">{i + 1}</span>
					<span class="ngram-phrase">{item.phrase}</span>
					<span class="tag">{item.count.toLocaleString()}</span>
				</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>

<style>
.ngram-list {
	padding: 0;
	list-style: none;
	font-variant-numeric: tabular-nums;
	display: grid;
	gap: 0;
}

.ngram-item {
	display: flex;
	align-items: center;
	gap: 0.875rem;
	border-block-end: 1px solid var(--rule);
	padding-block: 0.6rem;
	transition: background 0.1s ease;
	padding-inline: 0.25rem;
	border-radius: var(--radius);
}

.ngram-item:last-child {
	border-block-end: none;
}

.ngram-item:hover {
	background: rgba(255,255,255,0.025);
}

.ngram-rank {
	font-size: var(--fs-xs);
	font-weight: 700;
	font-family: var(--font-mono);
	color: var(--muted);
	min-width: 2rem;
	text-align: right;
	flex-shrink: 0;
}

.ngram-phrase {
	flex: 1;
	font-weight: 600;
	font-size: var(--fs-small);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
