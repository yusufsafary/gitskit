<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import { enhance } from '$app/forms';

	let { form } = $props();

	let walletStatus = $state<'idle' | 'connecting' | 'signing' | 'submitting' | 'error'>('idle');
	let walletError = $state('');
	let detectedWallet = $state<'phantom' | 'solflare' | 'backpack' | null>(null);

	// Wallet form hidden fields
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
		if (walletStatus === 'connecting') return 'Connecting…';
		if (walletStatus === 'signing') return 'Sign in your wallet…';
		if (walletStatus === 'submitting') return 'Verifying…';
		if (detectedWallet === 'phantom') return 'Connect Phantom';
		if (detectedWallet === 'solflare') return 'Connect Solflare';
		if (detectedWallet === 'backpack') return 'Connect Backpack';
		return 'Connect Solana Wallet';
	});

	const isBusy = $derived(
		walletStatus === 'connecting' || walletStatus === 'signing' || walletStatus === 'submitting'
	);
</script>

<svelte:head>
	<title>Sign In — GitSkit</title>
</svelte:head>

<div class="login-page">
	<!-- Ambient background blobs -->
	<div class="login-bg" aria-hidden="true">
		<div class="blob blob-1"></div>
		<div class="blob blob-2"></div>
		<div class="blob blob-3"></div>
	</div>

	<!-- Floating particles -->
	<div class="login-particles" aria-hidden="true">
		{#each Array(18) as _, i}
			<span class="particle" style="--i:{i};--x:{(i * 37 + 11) % 100}%;--s:{0.4 + (i % 5) * 0.15};--d:{2 + (i % 7) * 1.1}s;--delay:{(i * 0.41) % 3}s"></span>
		{/each}
	</div>

	<div class="login-box">
		<!-- Header -->
		<div class="login-header">
			<a href="/" class="login-logo" aria-label="GitSkit home">
				<Logo size={72} />
			</a>
			<p class="login-sub">Cut. Clip. Command.</p>
		</div>

		<!-- Devnet badge -->
		<div class="devnet-badge">
			<span class="devnet-dot"></span>
			<span>Solana · Devnet compatible</span>
		</div>

		<!-- Error banner -->
		{#if form?.error}
			<div class="error-banner">
				<span class="error-icon">⚠</span>
				<span>{form.error}</span>
			</div>
		{/if}

		<!-- Wallet card — sole login method -->
		<div class="auth-card auth-card-wallet">
			<div class="auth-card-label">Solana wallet access</div>

			{#if walletStatus === 'connecting' || walletStatus === 'signing' || walletStatus === 'submitting'}
				<div class="wallet-status" style="margin-bottom:0.75rem;">
					<span class="wallet-status-dot"></span>
					<span>
						{#if walletStatus === 'connecting'}Connecting to wallet…{/if}
						{#if walletStatus === 'signing'}Waiting for signature…{/if}
						{#if walletStatus === 'submitting'}Verifying on server…{/if}
					</span>
				</div>
			{/if}

			{#if walletError}
				<div class="wallet-error">{walletError}</div>
			{/if}

			<!-- Hidden wallet form -->
			<form method="POST" action="?/wallet" use:enhance bind:this={walletFormEl}>
				<input type="hidden" name="address" bind:value={walletAddress} />
				<input type="hidden" name="nonce" bind:value={walletNonce} />
				<input type="hidden" name="signature" bind:value={walletSignature} />
				<input type="hidden" name="message" bind:value={walletMessage} />
			</form>

			<button
				type="button"
				class="btn btn-wallet"
				onclick={connectWallet}
				disabled={isBusy}
			>
				{#if isBusy}
					<span class="btn-spinner"></span>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="flex-shrink:0;">
						<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
						<path d="M6 12c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						<path d="M9 9l6 3-6 3V9z" fill="currentColor"/>
					</svg>
				{/if}
				{walletLabel()}
			</button>

			<p class="wallet-support-note">
				Supports Phantom, Solflare, Backpack &amp; any Solana Wallet Standard wallet
			</p>
		</div>

		<div class="login-footer-link">
			<a href="/about">Learn about GitSkit →</a>
		</div>
	</div>
</div>

<style>
	/* Ambient blobs */
	.login-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.14;
	}

	.blob-1 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, #6eff57 0%, transparent 70%);
		top: -10%;
		left: -10%;
		animation: blobFloat 12s ease-in-out infinite;
	}

	.blob-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #a855f7 0%, transparent 70%);
		bottom: 5%;
		right: -5%;
		animation: blobFloat 16s ease-in-out infinite reverse;
	}

	.blob-3 {
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, #00c8ff 0%, transparent 70%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation: blobFloat 20s ease-in-out infinite;
	}

	@keyframes blobFloat {
		0%, 100% { transform: translate(0, 0) scale(1); }
		33% { transform: translate(30px, -20px) scale(1.05); }
		66% { transform: translate(-20px, 15px) scale(0.95); }
	}

	/* Floating particles */
	.login-particles {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.particle {
		position: absolute;
		left: var(--x);
		bottom: -6px;
		width: calc(var(--s) * 5px);
		height: calc(var(--s) * 5px);
		border-radius: 50%;
		background: hsl(calc(130 + var(--i) * 14), 90%, 70%);
		opacity: 0;
		animation: particleRise var(--d) ease-in infinite var(--delay);
		filter: blur(0.5px);
	}

	@keyframes particleRise {
		0%   { transform: translateY(0) translateX(0); opacity: 0; }
		10%  { opacity: 0.7; }
		80%  { opacity: 0.3; }
		100% { transform: translateY(-100vh) translateX(calc(sin(var(--i)) * 40px)); opacity: 0; }
	}

	/* Login layout */
	.login-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100dvh - 80px);
		padding: 2rem var(--gutter);
		position: relative;
	}

	.login-box {
		width: 100%;
		max-width: 400px;
		display: grid;
		gap: 1.25rem;
		position: relative;
		z-index: 1;
		animation: loginBoxEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes loginBoxEnter {
		from { opacity: 0; transform: translateY(20px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.login-header {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding-bottom: 0.5rem;
	}

	.login-logo {
		display: inline-block;
		background: none !important;
		flex-shrink: 0;
	}

	.login-logo:hover {
		background: none !important;
		opacity: 0.85;
	}

	.login-title {
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		text-transform: none;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.login-sub {
		font-size: var(--fs-small);
		color: var(--muted);
		font-family: var(--font-mono);
		max-width: none;
	}

	/* Devnet badge */
	.devnet-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.68rem;
		font-family: var(--font-mono);
		color: var(--accent-3);
		background: rgba(0, 200, 255, 0.08);
		border: 1px solid rgba(0, 200, 255, 0.2);
		border-radius: 100px;
		padding: 0.3rem 0.75rem;
		width: fit-content;
	}

	.devnet-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent-3);
		box-shadow: 0 0 6px var(--accent-3);
		animation: devnetPulse 2s ease-in-out infinite;
		flex-shrink: 0;
	}

	@keyframes devnetPulse {
		0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(0,200,255,0.8); }
		50%       { opacity: 0.6; box-shadow: 0 0 12px rgba(0,200,255,0.4); }
	}

	/* Error banner */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 71, 87, 0.08);
		border: 1px solid rgba(255, 71, 87, 0.25);
		border-radius: var(--radius);
		padding: 0.625rem 0.875rem;
		font-size: var(--fs-small);
		color: var(--danger);
		font-family: var(--font-mono);
	}

	.error-icon {
		flex-shrink: 0;
	}

	/* Auth cards */
	.auth-card {
		background: rgba(10, 10, 18, 0.8);
		border: 1px solid var(--rule);
		border-radius: var(--radius-xl);
		padding: 1.5rem;
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		position: relative;
		overflow: hidden;
		display: grid;
		gap: 1rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.auth-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 60%);
		pointer-events: none;
	}

	.auth-card-wallet {
		border-color: rgba(110, 255, 87, 0.2);
		box-shadow: 0 0 28px -6px rgba(110, 255, 87, 0.12), inset 0 1px 0 rgba(110,255,87,0.06);
		animation: cardPulse 4s ease-in-out infinite;
	}

	@keyframes cardPulse {
		0%, 100% { box-shadow: 0 0 28px -6px rgba(110,255,87,0.10), inset 0 1px 0 rgba(110,255,87,0.06); }
		50%       { box-shadow: 0 0 42px -4px rgba(110,255,87,0.22), inset 0 1px 0 rgba(110,255,87,0.08); }
	}

	.auth-card-wallet::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(160deg, rgba(110,255,87,0.04) 0%, transparent 50%);
		pointer-events: none;
	}

	.auth-card-label {
		font-size: 0.68rem;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
	}

	/* Wallet status */
	.wallet-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--fs-small);
		color: var(--accent);
		font-family: var(--font-mono);
	}

	.wallet-status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent);
		animation: wsDotPulse 1s ease-in-out infinite;
		flex-shrink: 0;
	}

	@keyframes wsDotPulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%       { opacity: 0.4; transform: scale(0.7); }
	}

	/* Wallet button */
	.btn-wallet {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.875rem 1.25rem;
		background: linear-gradient(135deg, rgba(110,255,87,0.14) 0%, rgba(110,255,87,0.06) 100%);
		border: 1px solid rgba(110, 255, 87, 0.35);
		border-radius: var(--radius-lg);
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: var(--fs-small);
		font-weight: 600;
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
		position: relative;
		overflow: hidden;
	}

	.btn-wallet::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(110,255,87,0.0) 0%, rgba(110,255,87,0.08) 100%);
		opacity: 0;
		transition: opacity 0.18s ease;
	}

	.btn-wallet:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(110,255,87,0.22) 0%, rgba(110,255,87,0.1) 100%);
		border-color: rgba(110, 255, 87, 0.6);
		box-shadow: 0 0 20px -4px rgba(110,255,87,0.35);
		transform: translateY(-1px);
	}

	.btn-wallet:hover:not(:disabled)::before {
		opacity: 1;
	}

	.btn-wallet:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-wallet:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.wallet-error {
		font-size: var(--fs-xs);
		color: var(--danger);
		font-family: var(--font-mono);
		background: rgba(255,71,87,0.06);
		border: 1px solid rgba(255,71,87,0.2);
		border-radius: var(--radius);
		padding: 0.5rem 0.75rem;
	}

	.wallet-support-note {
		font-size: 0.68rem;
		color: var(--muted);
		text-align: center;
		max-width: none;
		font-family: var(--font-mono);
	}

	/* Spinner inside button */
	.btn-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255,255,255,0.3);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Footer link */
	.login-footer-link {
		text-align: center;
	}

	.login-footer-link a {
		font-size: var(--fs-xs);
		color: var(--muted);
		font-family: var(--font-mono);
	}

	.login-footer-link a:hover {
		color: var(--ink-dim);
		background: none;
	}
</style>
