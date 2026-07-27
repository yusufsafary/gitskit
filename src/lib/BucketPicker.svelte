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
	<div class="row" style="justify-content:space-between;align-items:baseline;">
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label>{label}</label>
		{#if buckets.length > 1}
			<div class="row" style="gap:0.5rem;">
				<button type="button" class="btn btn-small btn-ghost" onclick={selectAll}>All</button>
				<button type="button" class="btn btn-small btn-ghost" onclick={selectNone}>None</button>
			</div>
		{/if}
	</div>

	{#if loading}
		<p class="muted" style="font-size:var(--fs-small);">Loading buckets...</p>
	{:else if err}
		<p style="color:var(--danger);font-size:var(--fs-small);">Error: {err}</p>
	{:else if buckets.length === 0}
		<p style="font-size:var(--fs-small);color:var(--muted);">
			No buckets found. Create a folder under <code>videos/</code> with a <code>videos/</code>
			subfolder inside it.
		</p>
	{:else}
		<div class="row" style="gap:0.5rem;flex-wrap:wrap;">
			{#each buckets as b (b.name)}
				<button
					type="button"
					class="btn btn-small"
					class:btn-primary={selected.includes(b.name)}
					class:btn-ghost={!selected.includes(b.name)}
					onclick={() => toggle(b.name)}
				>
					{b.name}
					<span style="opacity:0.6;margin-inline-start:0.3em;font-weight:400;">
						{b.transcriptCount}/{b.videoCount}
					</span>
				</button>
			{/each}
		</div>
		{#if help}
			<p style="font-size:var(--fs-small);color:var(--muted);">{help}</p>
		{/if}
	{/if}
</div>
