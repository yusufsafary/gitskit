<script lang="ts">
	let { size = 36 }: { size?: number } = $props();
</script>

<span class="logo-wrap" style="--sz: {size}px" aria-hidden="true">
	<span class="logo-frame f1">GS</span>
	<span class="logo-frame f2">GS</span>
	<span class="logo-frame f3">GK</span>
	<span class="logo-frame f4">GS</span>
</span>

<style>
	.logo-wrap {
		display: inline-block;
		width: var(--sz);
		height: var(--sz);
		position: relative;
		font-family: var(--font-mono);
		font-weight: 800;
		font-size: calc(var(--sz) * 0.38);
		line-height: 1;
		border-radius: 4px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.logo-frame {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		animation: gifloop 1.6s steps(1) infinite;
	}

	.f1 {
		background: var(--accent);
		color: var(--bg);
		animation-delay: 0s;
	}
	.f2 {
		background: var(--accent-2);
		color: #fff;
		animation-delay: 0.4s;
	}
	.f3 {
		background: var(--bg);
		color: var(--accent);
		border: 2px solid var(--accent);
		animation-delay: 0.8s;
	}
	.f4 {
		background: var(--accent-3);
		color: var(--bg);
		animation-delay: 1.2s;
	}

	@keyframes gifloop {
		0% { opacity: 1; }
		25% { opacity: 0; }
		100% { opacity: 0; }
	}
</style>
