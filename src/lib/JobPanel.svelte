<script lang="ts">
interface JobState {
	id: string;
	kind: string;
	status: 'running' | 'done' | 'error' | 'cancelled';
	logs: string[];
	error: string | null;
	result: Record<string, unknown> | null;
	startedAt: number;
	finishedAt: number | null;
}

function formatDuration(sec: number): string {
	if (!Number.isFinite(sec) || sec <= 0) return '0s';
	const m = Math.floor(sec / 60);
	const s = sec - m * 60;
	if (m === 0) return `${s.toFixed(1)}s`;
	return `${m}m ${s.toFixed(1)}s`;
}

let { jobId }: { jobId: string | null } = $props();

let cancelling = $state(false);
let elapsedSec = $state(0);
let elapsedTimer: ReturnType<typeof setInterval> | null = null;

async function cancel() {
	if (!jobId) return;
	cancelling = true;
	try {
		await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
	} catch (err) {
		console.error(err);
	} finally {
		cancelling = false;
	}
}

type PanelState = { job: JobState | null; mediaUrl: string | null };
let jobState: PanelState = $state({ job: null, mediaUrl: null });
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let logEl: HTMLPreElement | null = $state(null);

async function poll() {
	if (!jobId) return;
	try {
		const res = await fetch(`/api/jobs/${jobId}`);
		if (!res.ok) throw new Error(await res.text());
		const data: PanelState = await res.json();
		jobState = data;

		if (logEl) {
			logEl.scrollTop = logEl.scrollHeight;
		}

		if (data.job && (data.job.status === 'running')) {
			pollTimer = setTimeout(poll, 800);
		} else {
			if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
		}
	} catch (err) {
		console.error(err);
		pollTimer = setTimeout(poll, 3000);
	}
}

$effect(() => {
	if (!jobId) return;
	jobState = { job: null, mediaUrl: null };
	elapsedSec = 0;
	if (pollTimer) clearTimeout(pollTimer);
	if (elapsedTimer) clearInterval(elapsedTimer);
	poll();
	elapsedTimer = setInterval(() => { elapsedSec += 0.1; }, 100);

	return () => {
		if (pollTimer) clearTimeout(pollTimer);
		if (elapsedTimer) clearInterval(elapsedTimer);
	};
});
</script>

<div class="job-panel">
	{#if !jobState.job}
	<div class="job-loading card">
		<div class="job-loading-inner">
			<span class="status status-running">Starting job…</span>
		</div>
		<div class="progress-bar-wrap" style="margin-top:1rem;">
			<div class="progress-bar"></div>
		</div>
	</div>

	{:else}
	<div class="card stack">
		<!-- Header -->
		<div class="job-header">
			<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
				<span class="status status-{jobState.job.status}">
					{jobState.job.status}
				</span>
				<span class="tag tag-purple" style="text-transform:lowercase;letter-spacing:0;">{jobState.job.kind}</span>
			</div>
			<span class="job-elapsed">
				{#if jobState.job.status === 'running'}
					{elapsedSec.toFixed(1)}s
				{:else if jobState.job.finishedAt}
					{formatDuration((jobState.job.finishedAt - jobState.job.startedAt) / 1000)}
				{/if}
			</span>
		</div>

		<!-- Running progress bar -->
		{#if jobState.job.status === 'running'}
		<div class="progress-bar-wrap">
			<div class="progress-bar"></div>
		</div>
		{/if}

		<!-- Dry run results -->
		{#if jobState.job.status === 'done' && jobState.job.result}
			{@const r = jobState.job.result as any}
			{#if r.dryRun}
			<div class="stat-grid" style="border-radius:var(--radius);">
				<div class="stat-item">
					<span class="stat-label">Matches</span>
					<span class="stat-value accent" style="font-size:1.5rem;">{r.matchCount}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Segments</span>
					<span class="stat-value" style="font-size:1.5rem;">{r.segmentCount}</span>
				</div>
				{#if r.tiledSegments > 0}
				<div class="stat-item">
					<span class="stat-label">Tiled</span>
					<span class="stat-value purple" style="font-size:1.5rem;">{r.tiledSegments}</span>
				</div>
				{/if}
				<div class="stat-item">
					<span class="stat-label">Est. runtime</span>
					<span class="stat-value blue" style="font-size:1.5rem;">{formatDuration(r.estimatedDurationSec ?? 0)}</span>
				</div>
			</div>
			<p style="font-size:var(--fs-xs);color:var(--muted);font-family:var(--font-mono);">
				Dry run complete — uncheck "Dry run" and submit to render.
			</p>
			{/if}
		{/if}

		<!-- Error -->
		{#if jobState.job.error}
		<div class="card" style="border-color:var(--danger);background:rgba(255,71,87,0.06);padding:1rem;">
			<p style="color:var(--danger);font-size:0.75rem;font-family:var(--font-mono);max-width:none;white-space:pre-wrap;">{jobState.job.error}</p>
		</div>
		{/if}

		<!-- Video output -->
		{#if jobState.mediaUrl}
		<div style="display:grid;gap:0.75rem;">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				controls
				src={jobState.mediaUrl}
				style="width:100%;border-radius:var(--radius);border:1px solid var(--rule);background:var(--bg-3);"
			></video>
			<div style="display:flex;gap:0.5rem;">
				<a
					class="btn btn-primary btn-small"
					href={jobState.mediaUrl}
					download
				>Download →</a>
				<a
					class="btn btn-ghost btn-small"
					href="/clips"
				>View all clips</a>
			</div>
		</div>
		{/if}

		<!-- Logs -->
		<pre class="log-panel" bind:this={logEl}>{#each jobState.job.logs as line}<span
			class="log-line"
			class:log-line-error={line.startsWith('ERROR')}
			class:log-line-done={jobState.job.status === 'done' && !line.startsWith('ERROR')}
		>{line}
</span>{/each}</pre>

		<!-- Cancel button -->
		{#if jobState.job.status === 'running'}
		<button
			type="button"
			class="btn btn-ghost btn-small btn-danger"
			onclick={cancel}
			disabled={cancelling}
			style="justify-self:start;"
		>
			{cancelling ? 'Cancelling…' : 'Cancel job'}
		</button>
		{/if}
	</div>
	{/if}
</div>

<style>
.job-panel {
	display: grid;
}

.job-loading {
	display: grid;
	gap: 0;
}

.job-loading-inner {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.5rem 0;
}
</style>
