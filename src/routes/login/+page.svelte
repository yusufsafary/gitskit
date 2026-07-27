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
		// Fallback: try window.solana (most wallets inject this)
		return w.solana ?? null;
	}

	async function connectWallet() {
		detectWallet();
		walletStatus = 'connecting';
		walletError = '';
		try {
			const provider = await getProvider();
			if (!provider) {
				walletError =
					'No Solana wallet detected. Please install Phantom, Solflare, or Backpack.';
				walletStatus = 'error';
				return;
			}

			// Connect wallet
			const resp = await provider.connect();
			const address = resp.publicKey?.toString() ?? provider.publicKey?.toString();
			if (!address) throw new Error('Could not get public key from wallet.');
			walletAddress = address;

			// Fetch nonce from server
			walletStatus = 'signing';
			const nonceRes = await fetch('/api/auth/nonce', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address })
			});
			if (!nonceRes.ok) throw new Error('Failed to fetch nonce.');
			const { nonce } = await nonceRes.json();
			walletNonce = nonce;

			// Build message to sign
			const msg = `Sign in to GitSkit\n\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
			walletMessage = msg;

			// Request signature
			const encoded = new TextEncoder().encode(msg);
			const signed = await provider.signMessage(encoded, 'utf8');

			// Convert signature to hex
			const sigBytes: Uint8Array = signed.signature ?? signed;
			const hex = Array.from(sigBytes)
				.map((b) => (b as number).toString(16).padStart(2, '0'))
				.join('');
			walletSignature = hex;

			// Submit the form
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
</script>

<svelte:head>
	<title>Sign In - GitSkit</title>
</svelte:head>

<div class="login-page">
	<div class="login-box">
		<div class="login-header">
			<a href="/" class="login-logo" aria-label="GitSkit home">
				<Logo size={56} />
			</a>
			<h1 style="font-size:var(--fs-3);letter-spacing:-0.01em;text-transform:none;">
				Welcome to <span class="mark">GitSkit</span>
			</h1>
			<p style="font-size:var(--fs-small);color:var(--muted);max-width:none;">
				Cut. Clip. Command. Sign in to access your studio.
			</p>
		</div>

		{#if form?.error}
			<div class="card" style="border-color:var(--danger);background:rgba(255,71,87,0.08);">
				<p style="color:var(--danger);font-size:var(--fs-small);font-weight:600;max-width:none;">{form.error}</p>
			</div>
		{/if}

		<!-- Password login -->
		<div class="card" style="gap:1.25rem;display:grid;">
			<div style="display:grid;gap:0.25rem;">
				<h2 style="font-size:1rem;text-transform:none;letter-spacing:0;font-weight:600;">Access Code</h2>
				<p style="font-size:var(--fs-small);">Enter your studio access password.</p>
			</div>
			<form method="POST" action="?/password" use:enhance>
				<div class="field" style="margin-block-end:1rem;">
					<label for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						bind:value={passwordValue}
						placeholder="Enter access code..."
						autocomplete="current-password"
						required
					/>
				</div>
				<button type="submit" class="btn btn-primary" style="width:100%;">
					Sign In
				</button>
			</form>
		</div>

		<div class="login-divider">or</div>

		<!-- Wallet login -->
		<div class="card" style="display:grid;gap:1.25rem;">
			<div style="display:grid;gap:0.25rem;">
				<h2 style="font-size:1rem;text-transform:none;letter-spacing:0;font-weight:600;">
					Solana Wallet
				</h2>
				<p style="font-size:var(--fs-small);">
					Sign in with Phantom, Solflare, or Backpack. Works with any Solana wallet that injects into the browser.
				</p>
			</div>

			{#if walletError}
				<p style="color:var(--danger);font-size:var(--fs-small);font-weight:500;">{walletError}</p>
			{/if}

			<!-- Hidden form submitted programmatically after wallet signs -->
			<form
				bind:this={walletFormEl}
				method="POST"
				action="?/wallet"
				use:enhance
				style="display:none;"
			>
				<input type="hidden" name="address" bind:value={walletAddress} />
				<input type="hidden" name="nonce" bind:value={walletNonce} />
				<input type="hidden" name="signature" bind:value={walletSignature} />
				<input type="hidden" name="message" bind:value={walletMessage} />
			</form>

			<button
				type="button"
				class="btn btn-wallet"
				onclick={connectWallet}
				disabled={walletStatus === 'connecting' || walletStatus === 'signing' || walletStatus === 'submitting'}
			>
				{#if walletStatus === 'connecting'}
					Connecting wallet...
				{:else if walletStatus === 'signing'}
					Sign the message in your wallet...
				{:else if walletStatus === 'submitting'}
					Verifying...
				{:else}
					{#if detectedWallet === 'phantom'}
						Connect Phantom
					{:else if detectedWallet === 'solflare'}
						Connect Solflare
					{:else if detectedWallet === 'backpack'}
						Connect Backpack
					{:else}
						Connect Solana Wallet
					{/if}
				{/if}
			</button>

			<p style="font-size:0.7rem;color:var(--muted);max-width:none;text-align:center;">
				Supports Phantom, Solflare, Backpack, and any wallet compatible with the Solana Wallet Standard.
			</p>
		</div>

		<div style="text-align:center;">
			<a href="/about" style="font-size:var(--fs-small);color:var(--muted);">Learn about GitSkit</a>
		</div>
	</div>
</div>

<style>
	.login-logo {
		display: inline-block;
		background: none;
		text-align: center;
	}
	.login-logo:hover {
		background: none;
	}
</style>
