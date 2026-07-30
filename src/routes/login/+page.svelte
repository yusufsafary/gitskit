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

	// Terminal boot sequence state
	let bootStep = $state(0); // 0=idle, 1=cmd, 2=checking, 3=wallet-result, 4=prompt-line

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

		// Staggered terminal boot sequence
		const t1 = setTimeout(() => bootStep = 1, 500);   // auth command types
		const t2 = setTimeout(() => bootStep = 2, 1100);  // "Checking…" appears
		const t3 = setTimeout(() => bootStep = 3, 1700);  // wallet detection result
		const t4 = setTimeout(() => bootStep = 4, 2200);  // connect prompt appears

		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
			clearTimeout(t4);
		};
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
	<!-- Animated grid -->
	<div class="grid-bg" aria-hidden="true"></div>

	<!-- Radial vignette -->
	<div class="vignette" aria-hidden="true"></div>

	<!-- Accent corner glow -->
	<div class="corner-glow corner-glow-tl" aria-hidden="true"></div>
	<div class="corner-glow corner-glow-br" aria-hidden="true"></div>

	<div class="login-split">
		<!-- ── Left: brand identity ─────────────────────────────── -->
		<div class="brand-col">
			<div class="brand-inner">
				<!-- Logo + wordmark -->
				<a href="/" class="brand-logo anim-item" style="--d:0ms" aria-label="GitSkit home">
					<span class="logo-wrap">
						<Logo size={52} />
						<span class="logo-ring"></span>
					</span>
					<span class="brand-name">GitSkit</span>
				</a>

				<!-- Tagline with per-word reveal -->
				<div class="brand-tagline anim-item" style="--d:80ms" aria-label="Cut. Clip. Command.">
					<span class="word-wrap">
						<span class="word word-1">Cut.</span>
					</span>
					<span class="word-wrap">
						<span class="word word-2">Clip.</span>
					</span>
					<span class="word-wrap">
						<span class="word word-accent">Command.</span>
					</span>
				</div>

				<p class="brand-desc anim-item" style="--d:260ms">
					A self-hosted video transcript supercut studio.
					Transcribe footage, search word-level, render precision cuts.
				</p>

				<!-- Feature lines — each staggered -->
				<ul class="feature-list" aria-label="Features">
					{#each [
						{ cmd: 'gitskit transcribe', desc: '— xAI word-level transcription', d: 380 },
						{ cmd: 'gitskit clips',      desc: '— search & preview every word',  d: 500 },
						{ cmd: 'gitskit supercut',   desc: '— render multi-source cuts',     d: 620 },
						{ cmd: 'gitskit songify',    desc: '— build rhythm from speech',     d: 740 },
					] as f}
						<li class="feat-item anim-item" style="--d:{f.d}ms">
							<span class="feat-prompt">$</span>
							<span class="feat-cmd">{f.cmd}</span>
							<span class="feat-desc">{@html f.desc}</span>
						</li>
					{/each}
				</ul>

				<div class="brand-badges anim-item" style="--d:860ms">
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
			<div class="terminal anim-terminal">
				<!-- Scanline overlay -->
				<div class="scanlines" aria-hidden="true"></div>

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
					<!-- Line 1: auth command — typewriter -->
					{#if bootStep >= 1}
						<div class="term-line anim-line">
							<span class="term-user">gitskit</span><span class="term-at">@</span><span class="term-host">xyz</span><span class="term-sep"> ~ % </span><span class="term-cmd typewriter">auth --wallet</span>
						</div>
					{:else}
						<div class="term-line term-line-ghost">
							<span class="term-user">gitskit</span><span class="term-at">@</span><span class="term-host">xyz</span><span class="term-sep"> ~ % </span><span class="caret-only">▋</span>
						</div>
					{/if}

					<!-- Line 2: checking -->
					{#if bootStep >= 2}
						<div class="term-output anim-line">
							<span class="out-dim">Checking for Solana wallet…</span>
						</div>
					{/if}

					<!-- Line 3: wallet detection result -->
					{#if bootStep >= 3}
						{#if mounted && detectedWallet}
							<div class="term-output anim-line">
								<span class="out-found">
									<span class="out-tick">✓</span>
									{detectedWallet} detected
								</span>
							</div>
						{:else if mounted}
							<div class="term-output anim-line">
								<span class="out-warn">
									<span class="out-warn-icon">!</span>
									no wallet — install Phantom, Solflare, or Backpack
								</span>
							</div>
						{/if}
					{/if}

					<!-- Error from form submission -->
					{#if form?.error}
						<div class="term-error anim-line">
							<span class="err-prefix">error:</span>
							{form.error}
						</div>
					{/if}

					{#if walletError}
						<div class="term-error anim-line">
							<span class="err-prefix">error:</span>
							{walletError}
						</div>
					{/if}

					{#if isBusy}
						<div class="term-busy anim-line">
							<span class="busy-spinner"></span>
							{#if walletStatus === 'connecting'}connecting to wallet…{/if}
							{#if walletStatus === 'signing'}waiting for signature…{/if}
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

					<!-- Line 4: connect prompt -->
					{#if bootStep >= 4}
						<div class="term-prompt-row anim-line">
							<span class="term-user">gitskit</span><span class="term-at">@</span><span class="term-host">xyz</span><span class="term-sep"> ~ % </span>
							<button
								type="button"
								class="term-btn"
								class:term-btn-busy={isBusy}
								onclick={connectWallet}
								disabled={isBusy}
							>
								{#if isBusy}
									<span class="btn-busy-dot"></span>
								{:else}
									<span class="btn-caret" aria-hidden="true">▋</span>
								{/if}
								{walletLabel()}
							</button>
						</div>
					{/if}

					{#if bootStep >= 4}
						<p class="term-footnote anim-line">
							Supports Phantom, Solflare, Backpack &amp; any Wallet Standard wallet
						</p>
					{/if}
				</div>

				<!-- Bottom progress bar (fills during boot) -->
				<div class="term-progress">
					<div class="term-progress-fill" class:booted={bootStep >= 4}></div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════
	   Root & Background
	   ═══════════════════════════════════════════════════════════ */
	.login-root {
		position: relative;
		min-height: calc(100dvh - 80px);
		display: flex;
		align-items: center;
		padding: clamp(2rem, 5vw, 4rem) var(--gutter);
		overflow: hidden;
	}

	/* Drifting grid */
	.grid-bg {
		position: fixed;
		inset: -100px;
		pointer-events: none;
		z-index: 0;
		background-image:
			linear-gradient(rgba(110, 255, 87, 0.032) 1px, transparent 1px),
			linear-gradient(90deg, rgba(110, 255, 87, 0.032) 1px, transparent 1px);
		background-size: 52px 52px;
		animation: gridDrift 28s linear infinite;
	}

	@keyframes gridDrift {
		from { transform: translate(0, 0); }
		to   { transform: translate(52px, 52px); }
	}

	/* Radial vignette over grid */
	.vignette {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 1;
		background: radial-gradient(ellipse 75% 70% at 50% 50%, transparent 40%, var(--bg) 100%);
	}

	/* Corner ambient glows */
	.corner-glow {
		position: fixed;
		width: 600px;
		height: 600px;
		border-radius: 50%;
		pointer-events: none;
		z-index: 0;
		filter: blur(120px);
	}

	.corner-glow-tl {
		top: -200px;
		left: -200px;
		background: radial-gradient(circle, rgba(110,255,87,0.07) 0%, transparent 70%);
		animation: glowDrift 18s ease-in-out infinite;
	}

	.corner-glow-br {
		bottom: -200px;
		right: -200px;
		background: radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%);
		animation: glowDrift 22s ease-in-out infinite reverse;
	}

	@keyframes glowDrift {
		0%, 100% { transform: translate(0,0) scale(1); }
		33%      { transform: translate(40px,-30px) scale(1.1); }
		66%      { transform: translate(-25px,20px) scale(0.92); }
	}

	/* ═══════════════════════════════════════════════════════════
	   Split layout
	   ═══════════════════════════════════════════════════════════ */
	.login-split {
		position: relative;
		z-index: 2;
		width: 100%;
		max-width: 1040px;
		margin-inline: auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(3rem, 6vw, 6rem);
		align-items: center;
	}

	@media (max-width: 760px) {
		.login-split { grid-template-columns: 1fr; gap: 2.5rem; }
		.login-root  { padding: 1.75rem var(--gutter) 2.5rem; align-items: flex-start; }
	}

	/* ═══════════════════════════════════════════════════════════
	   Brand column entrance animations
	   ═══════════════════════════════════════════════════════════ */

	/* Base item entrance */
	.anim-item {
		opacity: 0;
		transform: translateY(18px);
		animation: itemEnter 0.62s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		animation-delay: var(--d, 0ms);
	}

	@keyframes itemEnter {
		to { opacity: 1; transform: translateY(0); }
	}

	/* Logo */
	.brand-logo {
		display: inline-flex;
		align-items: center;
		gap: 0.875rem;
		background: none !important;
		width: fit-content;
		transition: opacity 0.15s ease;
	}

	.brand-logo:hover { opacity: 0.85; background: none !important; }

	.logo-wrap {
		position: relative;
		display: inline-block;
	}

	/* Ring that pulses around logo */
	.logo-ring {
		position: absolute;
		inset: -4px;
		border-radius: 22px;
		border: 1px solid rgba(110,255,87,0);
		animation: ringPulse 3.5s ease-in-out infinite 1.5s;
	}

	@keyframes ringPulse {
		0%  { border-color: rgba(110,255,87,0); box-shadow: 0 0 0 0 rgba(110,255,87,0); }
		40% { border-color: rgba(110,255,87,0.4); box-shadow: 0 0 14px 2px rgba(110,255,87,0.12); }
		100%{ border-color: rgba(110,255,87,0); box-shadow: 0 0 0 0 rgba(110,255,87,0); }
	}

	.brand-name {
		font-size: 1.65rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		color: var(--ink);
	}

	/* ── Tagline: per-word clip reveal ── */
	.brand-tagline {
		display: flex;
		flex-wrap: wrap;
		gap: 0.18em;
		font-size: clamp(2rem, 5vw, 3.25rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 1.05;
		font-family: var(--font-sans);
	}

	.word-wrap {
		overflow: hidden;
		display: inline-block;
	}

	.word {
		display: inline-block;
		clip-path: inset(100% 0 0 0);
		animation: wordReveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.word-1 { animation-delay: 120ms; color: var(--ink); }
	.word-2 { animation-delay: 260ms; color: var(--ink); }
	.word-accent {
		animation-delay: 390ms;
		color: var(--accent);
		text-shadow: 0 0 40px rgba(110,255,87,0.25);
	}

	@keyframes wordReveal {
		to { clip-path: inset(0% 0 0 0); }
	}

	.brand-desc {
		font-size: var(--fs-small);
		color: var(--ink-dim);
		line-height: 1.65;
		max-width: 38ch;
		margin: 0;
	}

	/* Feature list */
	.feature-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}

	.feat-item {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		line-height: 1.5;
	}

	.feat-prompt { color: var(--muted); flex-shrink: 0; user-select: none; }
	.feat-cmd    { color: var(--accent); font-weight: 600; white-space: nowrap; }
	.feat-desc   { color: var(--muted); }

	/* Badges */
	.brand-badges { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

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
		background: rgba(153,69,255,0.1);
		border: 1px solid rgba(153,69,255,0.25);
	}

	.badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #9945ff;
		animation: badgePulse 2.5s ease-in-out infinite;
		box-shadow: 0 0 6px rgba(153,69,255,0.6);
	}

	@keyframes badgePulse {
		0%,100% { opacity: 1; box-shadow: 0 0 6px rgba(153,69,255,0.6); }
		50%      { opacity: 0.4; box-shadow: none; }
	}

	.badge-devnet {
		color: var(--accent-3);
		background: rgba(0,200,255,0.08);
		border: 1px solid rgba(0,200,255,0.2);
	}

	.badge-link {
		color: var(--muted);
		background: none;
		border: 1px solid var(--rule);
		text-decoration: none;
		font-size: 0.65rem;
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
		transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
	}

	.badge-link:hover {
		color: var(--ink-dim);
		background: rgba(255,255,255,0.04);
		border-color: var(--rule-hover);
	}

	/* ═══════════════════════════════════════════════════════════
	   Terminal window
	   ═══════════════════════════════════════════════════════════ */
	.auth-col { display: flex; flex-direction: column; align-items: stretch; }

	.anim-terminal {
		opacity: 0;
		transform: translateX(28px) translateY(8px);
		animation: termEnter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards;
	}

	@keyframes termEnter {
		to { opacity: 1; transform: translateX(0) translateY(0); }
	}

	.terminal {
		background: #07070e;
		border: 1px solid rgba(110,255,87,0.22);
		border-radius: 11px;
		box-shadow:
			0 0 0 1px rgba(255,255,255,0.04) inset,
			0 28px 72px rgba(0,0,0,0.65),
			0 0 60px -20px rgba(110,255,87,0.18);
		overflow: hidden;
		position: relative;
		animation: termBorderPulse 4.5s ease-in-out infinite 2.5s;
	}

	@keyframes termBorderPulse {
		0%,100% { box-shadow: 0 0 0 1px rgba(255,255,255,0.04) inset, 0 28px 72px rgba(0,0,0,0.65), 0 0 40px -20px rgba(110,255,87,0.14); }
		50%      { box-shadow: 0 0 0 1px rgba(255,255,255,0.04) inset, 0 28px 72px rgba(0,0,0,0.65), 0 0 80px -10px rgba(110,255,87,0.28); }
	}

	/* CRT scanlines */
	.scanlines {
		position: absolute;
		inset: 0;
		z-index: 10;
		pointer-events: none;
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0px,
			transparent 3px,
			rgba(0,0,0,0.06) 3px,
			rgba(0,0,0,0.06) 4px
		);
		opacity: 0.6;
	}

	/* Title bar */
	.term-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #0c0c18;
		border-bottom: 1px solid rgba(255,255,255,0.07);
		user-select: none;
		position: relative;
		z-index: 11;
	}

	.term-dots { display: flex; gap: 6px; flex-shrink: 0; }

	.dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		transition: filter 0.2s ease;
	}

	.dot-red    { background: #ff5f57; box-shadow: 0 0 4px rgba(255,95,87,0.4); }
	.dot-yellow { background: #ffbd2e; box-shadow: 0 0 4px rgba(255,189,46,0.4); }
	.dot-green  { background: #28c840; box-shadow: 0 0 4px rgba(40,200,64,0.4); }

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
		box-shadow: 0 0 5px var(--accent-3);
	}

	@keyframes sdPulse {
		0%,100% { opacity: 1; box-shadow: 0 0 5px var(--accent-3); }
		50%      { opacity: 0.5; box-shadow: none; }
	}

	/* Terminal body */
	.term-body {
		padding: 1.25rem 1.375rem;
		display: grid;
		gap: 0.9rem;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		line-height: 1.6;
		position: relative;
		z-index: 11;
	}

	/* Line enter animation */
	.anim-line {
		animation: lineFadeIn 0.35s ease forwards;
	}

	@keyframes lineFadeIn {
		from { opacity: 0; transform: translateX(-8px); }
		to   { opacity: 1; transform: translateX(0); }
	}

	.term-line {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
	}

	.term-line-ghost { opacity: 0.35; }

	.term-user   { color: var(--accent); font-weight: 700; }
	.term-at     { color: var(--muted); }
	.term-host   { color: var(--accent-3); font-weight: 600; }
	.term-sep    { color: var(--muted); white-space: pre; }
	.term-cmd    { color: var(--ink-dim); }

	/* Typewriter effect on the auth command */
	.typewriter {
		overflow: hidden;
		white-space: nowrap;
		display: inline-block;
		border-right: 1px solid var(--ink-dim);
		animation:
			typing 0.55s steps(13) forwards,
			cursorBlink 0.75s step-end 0.55s 4;
	}

	@keyframes typing {
		from { width: 0; }
		to   { width: 7.8em; /* "auth --wallet" length */ }
	}

	@keyframes cursorBlink {
		0%,100% { border-color: var(--ink-dim); }
		50%      { border-color: transparent; }
	}

	/* Ghost caret when boot hasn't started yet */
	.caret-only {
		color: var(--accent);
		animation: caretBlink 1.1s step-end infinite;
		opacity: 0.7;
	}

	@keyframes caretBlink {
		0%,100% { opacity: 0.7; }
		50%      { opacity: 0; }
	}

	.term-output { display: flex; flex-direction: column; gap: 0.3rem; }

	.out-dim   { color: var(--muted); }

	.out-found {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
	}

	.out-tick  { font-weight: 700; }

	.out-warn {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		color: var(--warning);
	}

	.out-warn-icon { font-weight: 700; flex-shrink: 0; }

	.term-error {
		color: var(--danger);
		background: rgba(255,71,87,0.07);
		border: 1px solid rgba(255,71,87,0.18);
		border-radius: 5px;
		padding: 0.6rem 0.75rem;
		font-size: var(--fs-xs);
	}

	.err-prefix { color: #ff4757; font-weight: 700; margin-right: 0.35rem; }

	.term-busy {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--accent-3);
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

	@keyframes spin { to { transform: rotate(360deg); } }

	/* Connect prompt row */
	.term-prompt-row {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
	}

	.term-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
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
	}

	.term-btn:hover:not(:disabled) {
		color: #9aff85;
		text-shadow: 0 0 18px rgba(110,255,87,0.65);
	}

	.term-btn:disabled { opacity: 0.6; cursor: not-allowed; }

	.term-btn-busy { color: var(--accent-3) !important; }

	/* Blinking block caret inside button */
	.btn-caret {
		color: var(--accent);
		animation: caretBlink 1.1s step-end infinite;
		line-height: 1;
		display: inline-block;
		font-size: 0.85em;
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
		0%,100% { opacity: 1; transform: scale(1); }
		50%      { opacity: 0.4; transform: scale(0.65); }
	}

	.term-footnote {
		color: var(--muted);
		font-size: 0.63rem;
		max-width: none;
		margin: 0;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255,255,255,0.05);
	}

	/* ── Bottom progress bar ── */
	.term-progress {
		height: 2px;
		background: rgba(255,255,255,0.04);
		position: relative;
		z-index: 11;
	}

	.term-progress-fill {
		height: 100%;
		width: 0%;
		background: linear-gradient(90deg, var(--accent), var(--accent-3));
		box-shadow: 0 0 8px rgba(110,255,87,0.5);
		transition: width 1.8s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.term-progress-fill.booted {
		width: 100%;
	}
</style>
