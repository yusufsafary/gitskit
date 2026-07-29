<script lang="ts">
interface Bucket {
	name: string;
	videoCount: number;
	transcriptCount: number;
}

let {
	label = 'Buckets',
	help = '',
	selected = $bindable<string[]>([])
}: { label?: string; help?: string; selected: string[] } = $props();

let buckets = $state<Bucket[]>([]);
let loading = $state(true);
let err = $state('');

$effect(() => {
	fetch('/api/buckets')
		.then((r) => r.json())
		.then((data) => {
			buckets = data.buckets ?? [];
			if (selected.length === 0) {
				selected = buckets.map((b) => b.name);
			}
		})
		.catch((e) => (err = e.message))
		.finally(() => (loading = false));
});

function toggle(name: string) {
	if (selected.includes(name)) {
		selected = selected.filter((s) => s !== name);
	} else {
		selected = [...selected, name];
	}
}

function selectAll() {
	selected = buckets.map((b) => b.name);
}

function selectNone() {
	selected = [];
}
</script>

<div class="field">
	<div class="picker-header">
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label>{label}</label>
		{#if buckets.length > 1}
		<div style="display:flex;gap:0.375rem;">
			<button type="button" class="btn btn-small btn-ghost" onclick={selectAll}>All</button>
			<button type="button" class="btn btn-small btn-ghost" onclick={selectNone}>None</button>
		</div>
		{/if}
	</div>

	{#if loading}
	<div class="bucket-loading">
		<span class="bucket-dot"></span>
		<span class="bucket-dot" style="animation-delay:0.15s;"></span>
		<span class="bucket-dot" style="animation-delay:0.3s;"></span>
	</div>
	{:else if err}
	<p style="color:var(--danger);font-size:var(--fs-xs);font-family:var(--font-mono);">Error: {err}</p>
	{:else if buckets.length === 0}
	<p style="font-size:var(--fs-small);color:var(--muted);">
		No buckets found. Create a folder under <code>videos/</code> with a <code>videos/</code> subfolder inside.
	</p>
	{:else}
	<div class="bucket-grid">
		{#each buckets as b (b.name)}
		<button
			type="button"
			class="bucket-chip"
			class:active={selected.includes(b.name)}
			onclick={() => toggle(b.name)}
		>
			<span class="bucket-name">{b.name}</span>
			<span class="bucket-count">{b.transcriptCount}/{b.videoCount}</span>
		</button>
		{/each}
	</div>
	{#if help}
	<p style="font-size:var(--fs-xs);color:var(--muted);font-family:var(--font-mono);">{help}</p>
	{/if}
	{/if}
</div>

<style>
.picker-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
}

.bucket-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
}

.bucket-chip {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.35rem 0.75rem;
	font-size: var(--fs-xs);
	font-weight: 600;
	font-family: var(--font-sans);
	border-radius: var(--radius);
	border: 1px solid var(--rule);
	background: transparent;
	color: var(--ink-dim);
	cursor: pointer;
	transition: all 0.15s ease;
	text-transform: none;
	letter-spacing: 0;
}

.bucket-chip:hover {
	border-color: var(--rule-hover);
	color: var(--ink);
	background: rgba(255,255,255,0.04);
}

.bucket-chip.active {
	background: rgba(110, 255, 87, 0.1);
	border-color: rgba(110, 255, 87, 0.35);
	color: var(--accent);
}

.bucket-chip.active:hover {
	background: rgba(110, 255, 87, 0.15);
}

.bucket-name {
	font-weight: 700;
}

.bucket-count {
	opacity: 0.55;
	font-weight: 400;
	font-family: var(--font-mono);
	font-size: 0.65rem;
}

.bucket-loading {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 0.5rem 0;
}

.bucket-dot {
	display: block;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--muted);
	animation: dotPulse 1.2s ease-in-out infinite;
}

@keyframes dotPulse {
	0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
	40% { opacity: 1; transform: scale(1); }
}
</style>
