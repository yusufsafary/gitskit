<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import { enhance } from '$app/forms';

	let { form } = $props();

	let walletStatus = $state<'idle' | 'connecting' | 'signing' | 'submitting' | 'error'>('idle');
	let walletError = $state('');
	let detectedWallet = $state<'phantom' | 'solflare' | 'backpack' | null>(null);

	let walletAddress = $state('');
	let walletNonce = $state('');
	let walletSignature = $state('');
	let walletMessage = $state('');

	let walletFormEl: HTMLFormElement;

	function detectWallet() {
		if (typeof window === 'undefined') return;
		const w = window as any;
		if (w.phantom?.solana?.isPhantom) return (detectedWallet = 'phantom');
		if (w.solflare?.isSolflare) return (detectedWallet = 'solflare');
		if (w.backpack?.isBackpack) return (detectedWallet = 'backpack');
		return null;
	}

	async function getProvider(): Promise<any> {
		const w = window as any;
		if (detectedWallet === 'phantom') return w.phantom?.solana ?? w.solana;
		if (detectedWallet === 'solflare') return w.solflare;
		if (detectedWallet === 'backpack') return w.backpack;
		return w.solana ?? null;
	}

	async function connectWallet() {
		detectWallet();
		walletStatus = 'connecting';
		walletError = '';
		try {
			const provider = await getProvider();
			if (!provider) {
				walletError = 'No Solana wallet detected. Install Phantom, Solflare, or Backpack.';
				walletStatus = 'error';
				return;
			}

			const resp = await provider.connect();
			const address = resp.publicKey?.toString() ?? provider.publicKey?.toString();
			if (!address) throw new Error('Could not get public key from wallet.');
			walletAddress = address;

			walletStatus = 'signing';
			const nonceRes = await fetch('/api/auth/nonce', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address })
			});
			if (!nonceRes.ok) throw new Error('Failed to fetch nonce.');
			const { nonce } = await nonceRes.json();
			walletNonce = nonce;

			const msg = `Sign in to GitSkit\n\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
			walletMessage = msg;

			const encoded = new TextEncoder().encode(msg);
			const signed = await provider.signMessage(encoded, 'utf8');

			const sigBytes: Uint8Array = signed.signature ?? signed;
			const hex = Array.from(sigBytes)
				.map((b) => (b as number).toString(16).padStart(2, '0'))
				.join('');
			walletSignature = hex;

			walletStatus = 'submitting';
			walletFormEl.requestSubmit();
		} catch (err: any) {
			if (err?.code === 4001 || err?.message?.includes('User rejected')) {
				walletError = 'Connection cancelled.';
			} else {
				walletError = err?.message ?? 'Wallet connection failed.';
			}
			walletStatus = 'error';
		}
	}

	let mounted = $state(false);
	$effect(() => {
		mounted = true;
		detectWallet();
	});

	const walletLabel = $derived(() => {
		if (walletStatus === 'connecting') return 'connecting…';
		if (walletStatus === 'signing') return 'waiting for signature…';
		if (walletStatus === 'submitting') return 'verifying…';
		if (detectedWallet === 'phantom') return 'connect phantom';
		if (detectedWallet === 'solflare') return 'connect solflare';
		if (detectedWallet === 'backpack') return 'connect backpack';
		return 'connect wallet';
	});

	const isBusy = $derived(
		walletStatus === 'connecting' || walletStatus === 'signing' || walletStatus === 'submitting'
	);
</script>

<svelte:head>
	<title>Sign In — GitSkit</title>
</svelte:head>

<div class="login-root">
	<!-- Subtle grid background -->
	<div class="grid-bg" aria-hidden="true"></div>

	<div class="login-split">
		<!-- ── Left: brand identity ─────────────────────────────── -->
		<div class="brand-col">
			<div class="brand-inner">
				<a href="/" class="brand-logo" aria-label="GitSkit home">
					<Logo size={52} />
					<span class="brand-name">GitSkit</span>
				</a>

				<p class="brand-tagline">Cut. Clip. Command.</p>

				<div class="brand-desc">
					A self-hosted video transcript supercut studio.
					Transcribe footage, search word-level, render precision cuts — all from your browser.
				</div>

				<ul class="feature-list" aria-label="Features">
					<li>
						<span class="feat-prompt">$</span>
						<span class="feat-cmd">gitskit transcribe</span>
						<span class="feat-desc">— xAI word-level transcription</span>
					</li>
					<li>
						<span class="feat-prompt">$</span>
						<span class="feat-cmd">gitskit clips</span>
						<span class="feat-desc">— search &amp; preview every word</span>
					</li>
					<li>
						<span class="feat-prompt">$</span>
						<span class="feat-cmd">gitskit supercut</span>
						<span class="feat-desc">— render multi-source cuts</span>
					</li>
					<li>
						<span class="feat-prompt">$</span>
						<span class="feat-cmd">gitskit songify</span>
						<span class="feat-desc">— build rhythm from speech</span>
					</li>
				</ul>

				<div class="brand-badges">
					<span class="badge badge-solana">
						<span class="badge-dot"></span>
						Solana
					</span>
					<span class="badge badge-devnet">Devnet</span>
					<a href="/about" class="badge badge-link">About →</a>
				</div>
			</div>
		</div>

		<!-- ── Right: auth terminal ──────────────────────────────── -->
		<div class="auth-col">
			<div class="terminal">
				<!-- Terminal title bar -->
				<div class="term-bar">
					<div class="term-dots">
						<span class="dot dot-red"></span>
						<span class="dot dot-yellow"></span>
						<span class="dot dot-green"></span>
					</div>
					<span class="term-title">gitskit — auth</span>
					<span class="term-status">
						<span class="status-dot"></span>
						devnet
					</span>
				</div>

				<!-- Terminal body -->
				<div class="term-body">
					<div class="term-line">
						<span class="term-user">gitskit</span>
						<span class="term-at">@</span>
						<span class="term-host">xyz</span>
						<span class="term-sep"> ~ % </span>
						<span class="term-cmd">auth --wallet</span>
					</div>

					<div class="term-output">
						<span class="out-dim">Checking for Solana wallet…</span>
						{#if mounted && detectedWallet}
							<span class="out-found">
								<span class="out-tick">✓</span>
								{detectedWallet} detected
							</span>
						{:else if mounted}
							<span class="out-warn">
								<span class="out-warn-icon">!</span>
								no wallet detected — install Phantom, Solflare, or Backpack
							</span>
						{/if}
					</div>

					{#if form?.error}
						<div class="term-error">
							<span class="err-prefix">error:</span>
							{form.error}
						</div>
					{/if}

					{#if walletError}
						<div class="term-error">
							<span class="err-prefix">error:</span>
							{walletError}
						</div>
					{/if}

					{#if isBusy}
						<div class="term-busy">
							<span class="busy-spinner"></span>
							{#if walletStatus === 'connecting'}connecting to wallet…{/if}
							{#if walletStatus === 'signing'}waiting for signature in wallet…{/if}
							{#if walletStatus === 'submitting'}verifying on server…{/if}
						</div>
					{/if}

					<!-- Hidden wallet form -->
					<form method="POST" action="?/wallet" use:enhance bind:this={walletFormEl}>
						<input type="hidden" name="address" bind:value={walletAddress} />
						<input type="hidden" name="nonce" bind:value={walletNonce} />
						<input type="hidden" name="signature" bind:value={walletSignature} />
						<input type="hidden" name="message" bind:value={walletMessage} />
					</form>

					<!-- Prompt + button -->
					<div class="term-prompt-row">
						<span class="term-user">gitskit</span>
						<span class="term-at">@</span>
						<span class="term-host">xyz</span>
						<span class="term-sep"> ~ % </span>
						<button
							type="button"
							class="term-btn"
							onclick={connectWallet}
							disabled={isBusy}
						>
							{#if isBusy}
								<span class="btn-busy-dot"></span>
							{:else}
								<span class="btn-caret">_</span>
							{/if}
							{walletLabel()}
						</button>
					</div>

					<p class="term-footnote">
						Supports Phantom, Solflare, Backpack &amp; any Wallet Standard wallet
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* ── Root & grid background ───────────────────────────────── */
	.login-root {
		position: relative;
		min-height: calc(100dvh - 80px);
		display: flex;
		align-items: center;
		padding: clamp(2rem, 5vw, 4rem) var(--gutter);
		overflow: hidden;
	}

	.grid-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background-image:
			linear-gradient(rgba(110, 255, 87, 0.028) 1px, transparent 1px),
			linear-gradient(90deg, rgba(110, 255, 87, 0.028) 1px, transparent 1px);
		background-size: 48px 48px;
		mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%);
	}

	/* ── Split layout ─────────────────────────────────────────── */
	.login-split {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 1040px;
		margin-inline: auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(3rem, 6vw, 6rem);
		align-items: center;
	}

	@media (max-width: 760px) {
		.login-split {
			grid-template-columns: 1fr;
			gap: 2.5rem;
		}
	}

	/* ── Brand column ─────────────────────────────────────────── */
	.brand-col {
		display: flex;
		flex-direction: column;
	}

	.brand-inner {
		display: grid;
		gap: 1.75rem;
	}

	.brand-logo {
		display: inline-flex;
		align-items: center;
		gap: 0.875rem;
		background: none !important;
		width: fit-content;
		transition: opacity 0.15s ease;
	}

	.brand-logo:hover {
		background: none !important;
		opacity: 0.85;
	}

	.brand-name {
		font-size: 1.65rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		color: var(--ink);
		font-family: var(--font-sans);
	}

	.brand-tagline {
		font-size: clamp(2rem, 5vw, 3.25rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 1.05;
		color: var(--ink);
		font-family: var(--font-sans);
		max-width: none;
		margin: 0;
	}

	.brand-desc {
		font-size: var(--fs-small);
		color: var(--ink-dim);
		line-height: 1.65;
		max-width: 38ch;
		font-family: var(--font-sans);
	}

	/* Feature list */
	.feature-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.55rem;
	}

	.feature-list li {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		line-height: 1.5;
	}

	.feat-prompt {
		color: var(--muted);
		flex-shrink: 0;
		user-select: none;
	}

	.feat-cmd {
		color: var(--accent);
		font-weight: 600;
		white-space: nowrap;
	}

	.feat-desc {
		color: var(--muted);
	}

	/* Badges */
	.brand-badges {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.65rem;
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
	}

	.badge-solana {
		color: #9945ff;
		background: rgba(153, 69, 255, 0.1);
		border: 1px solid rgba(153, 69, 255, 0.25);
	}

	.badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #9945ff;
		animation: badgePulse 2.5s ease-in-out infinite;
	}

	@keyframes badgePulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.badge-devnet {
		color: var(--accent-3);
		background: rgba(0, 200, 255, 0.08);
		border: 1px solid rgba(0, 200, 255, 0.2);
	}

	.badge-link {
		color: var(--muted);
		background: none;
		border: 1px solid var(--rule);
		transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
		text-decoration: none;
		font-size: 0.65rem;
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
	}

	.badge-link:hover {
		color: var(--ink-dim);
		background: rgba(255,255,255,0.04);
		border-color: var(--rule-hover);
	}

	/* ── Auth column ──────────────────────────────────────────── */
	.auth-col {
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}

	/* ── Terminal window ──────────────────────────────────────── */
	.terminal {
		background: #08080f;
		border: 1px solid rgba(110, 255, 87, 0.18);
		border-radius: 10px;
		box-shadow:
			0 0 0 1px rgba(255,255,255,0.04) inset,
			0 24px 64px rgba(0,0,0,0.6),
			0 0 48px -16px rgba(110,255,87,0.12);
		overflow: hidden;
		animation: termEnter 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes termEnter {
		from { opacity: 0; transform: translateY(18px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* Title bar */
	.term-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #0d0d18;
		border-bottom: 1px solid rgba(255,255,255,0.06);
		user-select: none;
	}

	.term-dots {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
	}

	.dot-red    { background: #ff5f57; }
	.dot-yellow { background: #ffbd2e; }
	.dot-green  { background: #28c840; }

	.term-title {
		font-size: 0.7rem;
		font-family: var(--font-mono);
		color: var(--muted);
		flex: 1;
		text-align: center;
		letter-spacing: 0.04em;
	}

	.term-status {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.65rem;
		font-family: var(--font-mono);
		color: var(--accent-3);
		letter-spacing: 0.06em;
	}

	.status-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--accent-3);
		animation: sdPulse 2s ease-in-out infinite;
	}

	@keyframes sdPulse {
		0%, 100% { opacity: 1; box-shadow: 0 0 5px var(--accent-3); }
		50%       { opacity: 0.5; box-shadow: none; }
	}

	/* Terminal body */
	.term-body {
		padding: 1.25rem 1.375rem;
		display: grid;
		gap: 1rem;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		line-height: 1.6;
	}

	.term-line {
		display: flex;
		align-items: baseline;
		gap: 0;
		flex-wrap: wrap;
	}

	.term-user   { color: var(--accent); font-weight: 700; }
	.term-at     { color: var(--muted); }
	.term-host   { color: var(--accent-3); font-weight: 600; }
	.term-sep    { color: var(--muted); white-space: pre; }
	.term-cmd    { color: var(--ink-dim); }

	.term-output {
		display: grid;
		gap: 0.4rem;
		padding-left: 0;
	}

	.out-dim {
		color: var(--muted);
	}

	.out-found {
		color: var(--accent);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.out-tick {
		color: var(--accent);
		font-weight: 700;
	}

	.out-warn {
		color: var(--warning);
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
	}

	.out-warn-icon {
		font-weight: 700;
		flex-shrink: 0;
	}

	.term-error {
		color: var(--danger);
		background: rgba(255,71,87,0.07);
		border: 1px solid rgba(255,71,87,0.18);
		border-radius: 5px;
		padding: 0.6rem 0.75rem;
		font-size: var(--fs-xs);
	}

	.err-prefix {
		color: #ff4757;
		font-weight: 700;
		margin-right: 0.35rem;
	}

	.term-busy {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--accent-3);
		font-size: var(--fs-xs);
	}

	.busy-spinner {
		display: inline-block;
		width: 10px;
		height: 10px;
		border: 1.5px solid rgba(0,200,255,0.3);
		border-top-color: var(--accent-3);
		border-radius: 50%;
		animation: spin 0.65s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Prompt row with button */
	.term-prompt-row {
		display: flex;
		align-items: baseline;
		gap: 0;
		flex-wrap: wrap;
	}

	.term-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: none;
		padding: 0;
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 700;
		cursor: pointer;
		letter-spacing: 0.02em;
		transition: color 0.15s ease, text-shadow 0.15s ease;
		position: relative;
	}

	.term-btn:hover:not(:disabled) {
		color: #9aff85;
		text-shadow: 0 0 16px rgba(110,255,87,0.6);
	}

	.term-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Blinking cursor on the button */
	.btn-caret {
		color: var(--accent);
		opacity: 1;
		animation: caretBlink 1.1s step-end infinite;
		font-weight: 400;
		line-height: 1;
		display: inline-block;
		width: 7px;
	}

	@keyframes caretBlink {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0; }
	}

	.btn-busy-dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent-3);
		animation: bdPulse 0.8s ease-in-out infinite;
		flex-shrink: 0;
	}

	@keyframes bdPulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%       { opacity: 0.4; transform: scale(0.65); }
	}

	.term-footnote {
		color: var(--muted);
		font-size: 0.63rem;
		font-family: var(--font-mono);
		max-width: none;
		margin: 0;
		padding-top: 0.25rem;
		border-top: 1px solid rgba(255,255,255,0.05);
	}

	/* Mobile tweaks */
	@media (max-width: 760px) {
		.brand-tagline {
			font-size: 2rem;
		}
		.login-root {
			padding: 1.75rem var(--gutter) 2.5rem;
			align-items: flex-start;
		}
	}
</style>
