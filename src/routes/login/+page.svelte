<script lang="ts">
import Logo from '$lib/Logo.svelte';
import { enhance } from '$app/forms';

let { form } = $props();

let passwordValue = $state('');
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

	<div class="login-box">
		<!-- Header -->
		<div class="login-header">
			<a href="/" class="login-logo" aria-label="GitSkit home">
				<Logo size={60} />
			</a>
			<div>
				<h1 class="login-title">GitSkit</h1>
				<p class="login-sub">Cut. Clip. Command.</p>
			</div>
		</div>

		<!-- Error banner -->
		{#if form?.error}
		<div class="error-banner">
			<span class="error-icon">⚠</span>
			<span>{form.error}</span>
		</div>
		{/if}

		<!-- Password card -->
		<div class="auth-card">
			<div class="auth-card-label">Password access</div>
			<form method="POST" action="?/password" use:enhance>
				<div class="field">
					<label for="password">Access password</label>
					<input
						id="password"
						type="password"
						name="password"
						bind:value={passwordValue}
						placeholder="Enter your password…"
						autocomplete="current-password"
						required
					/>
				</div>
				<button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.75rem;">
					Enter Studio
				</button>
			</form>
		</div>

		<!-- Divider -->
		<div class="login-divider">or</div>

		<!-- Wallet card -->
		<div class="auth-card auth-card-wallet">
			<div class="auth-card-label">Web3 access</div>

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
	opacity: 0.12;
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
	transition: border-color 0.2s ease;
}

.auth-card::before {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 60%);
	pointer-events: none;
}

.auth-card:hover {
	border-color: rgba(255,255,255,0.12);
}

.auth-card-wallet {
	background: rgba(168, 85, 247, 0.04);
	border-color: rgba(168, 85, 247, 0.2);
}

.auth-card-wallet:hover {
	border-color: rgba(168, 85, 247, 0.35);
}

.auth-card-label {
	font-size: var(--fs-xs);
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.12em;
	color: var(--muted);
	font-family: var(--font-mono);
}

/* Error banner */
.error-banner {
	display: flex;
	align-items: center;
	gap: 0.625rem;
	background: rgba(255, 71, 87, 0.1);
	border: 1px solid rgba(255, 71, 87, 0.3);
	border-radius: var(--radius-lg);
	padding: 0.75rem 1rem;
	font-size: var(--fs-small);
	font-weight: 600;
	color: var(--danger);
}

.error-icon {
	font-size: 1rem;
	flex-shrink: 0;
}

/* Wallet-specific */
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
