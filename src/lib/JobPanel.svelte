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
			queueMicrotask(() => {
				if (logEl) logEl.scrollTop = logEl.scrollHeight;
			});
			if (data.job && data.job.status === 'running') {
				pollTimer = setTimeout(poll, 1000);
			}
		} catch (err) {
			console.error(err);
			pollTimer = setTimeout(poll, 2000);
		}
	}

	$effect(() => {
		if (!jobId) {
			jobState = { job: null, mediaUrl: null };
			if (pollTimer) clearTimeout(pollTimer);
			return;
		}
		poll();
		return () => {
			if (pollTimer) clearTimeout(pollTimer);
		};
	});

	function elapsed(start: number, end: number | null): string {
		const ms = (end ?? Date.now()) - start;
		const s = Math.floor(ms / 1000);
		if (s < 60) return `${s}s`;
		const m = Math.floor(s / 60);
		const rem = s % 60;
		return `${m}m ${rem}s`;
	}
</script>

<div class="panel" style="display:grid;gap:1rem;">
	<h3 style="font-size:1rem;text-transform:none;letter-spacing:0;font-weight:600;color:var(--ink-dim);">Output</h3>

	{#if !jobId}
		<p class="muted" style="font-size:var(--fs-small);">Submit the form to start a job.</p>
	{:else if !jobState.job}
		<p class="muted" style="font-size:var(--fs-small);">Loading...</p>
	{:else}
		<div class="row" style="justify-content:space-between;">
			<span
				class="status"
				class:status-running={jobState.job.status === 'running'}
				class:status-done={jobState.job.status === 'done'}
				class:status-error={jobState.job.status === 'error'}
				class:status-cancelled={jobState.job.status === 'cancelled'}
			>
				{jobState.job.status}
			</span>
			<div class="row" style="gap:0.75rem;">
				{#if jobState.job.status === 'running'}
					<button type="button" class="btn btn-ghost btn-small" onclick={cancel} disabled={cancelling}>
						{cancelling ? 'Cancelling...' : 'Cancel'}
					</button>
				{/if}
				<span class="caps muted">{elapsed(jobState.job.startedAt, jobState.job.finishedAt)}</span>
			</div>
		</div>

		{#if jobState.job.status === 'done' && jobState.job.result?.dryRun}
			{@const r = jobState.job.result as {
				totalHits?: number;
				segments?: number;
				tiledSegments?: number;
				estimatedDurationSec?: number;
			}}
			<div class="stat-grid" style="border:1px solid var(--rule);padding:1.25rem;border-radius:var(--radius);">
				<div class="stat-item">
					<span class="stat-label">Hits</span>
					<span class="stat-value accent">{r.totalHits ?? 0}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Segments</span>
					<span class="stat-value">{r.segments ?? 0}</span>
				</div>
				{#if r.tiledSegments && r.tiledSegments > 0}
					<div class="stat-item">
						<span class="stat-label">Tiled</span>
						<span class="stat-value purple">{r.tiledSegments}</span>
					</div>
				{/if}
				<div class="stat-item">
					<span class="stat-label">Est. runtime</span>
					<span class="stat-value accent">{formatDuration(r.estimatedDurationSec ?? 0)}</span>
				</div>
			</div>
			<p style="font-size:var(--fs-small);color:var(--muted);">
				Dry run complete. Uncheck "Dry run" and submit to render.
			</p>
		{/if}

		{#if jobState.job.error}
			<div class="card" style="border-color:var(--danger);background:rgba(255,71,87,0.08);">
				<p style="color:var(--danger);font-size:var(--fs-small);font-family:var(--font-mono);max-width:none;">
					{jobState.job.error}
				</p>
			</div>
		{/if}

		{#if jobState.mediaUrl}
			<div style="display:grid;gap:0.75rem;">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					controls
					src={jobState.mediaUrl}
					style="width:100%;border-radius:var(--radius);border:1px solid var(--rule);"
				></video>
				<a
					class="btn btn-primary btn-small"
					href={jobState.mediaUrl}
					download
					style="justify-self:start;"
				>
					Download
				</a>
			</div>
		{/if}

		<pre class="log-panel" bind:this={logEl}>{#each jobState.job.logs as line}<span
				class="log-line"
				class:log-line-error={line.startsWith('ERROR')}
				class:log-line-done={jobState.job.status === 'done'}
			>{line}
</span>{/each}</pre>
	{/if}
</div>
