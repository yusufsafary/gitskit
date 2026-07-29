<script lang="ts">
import '../app.css';
import { page } from '$app/stores';
import Logo from '$lib/Logo.svelte';

const appLinks = [
	{ href: '/', label: 'Library' },
	{ href: '/clips', label: 'Clips' },
	{ href: '/supercut', label: 'Supercut' },
	{ href: '/sentence', label: 'Sentence' },
	{ href: '/songify', label: 'Songify' },
	{ href: '/transcribe', label: 'Transcribe' },
	{ href: '/stats', label: 'Stats' },
];

const infoLinks = [
	{ href: '/about', label: 'About' },
	{ href: '/how-to', label: 'How To' },
	{ href: '/demo', label: 'Demo' },
	{ href: '/cookies', label: 'Cookies' },
];

let { children, data } = $props();
const isPublicPage = $derived(
	['/login', '/about', '/how-to', '/cookies', '/demo'].includes($page.url.pathname)
);

let menuOpen = $state(false);

function toggleMenu() {
	menuOpen = !menuOpen;
}

function closeMenu() {
	menuOpen = false;
}
</script>

{#if data.user}
<header class="topbar">
	<a href="/" class="wordmark" onclick={closeMenu}>
		<Logo size={32} />
		<span>GitSkit</span>
	</a>
	<nav class="nav desktop-nav" aria-label="Primary navigation">
		{#each appLinks as link}
			<a
				href={link.href}
				aria-current={$page.url.pathname === link.href ? 'page' : undefined}
			>{link.label}</a>
		{/each}
		<span class="nav-divider"></span>
		{#each infoLinks.slice(0, 2) as link}
			<a href={link.href} aria-current={$page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a>
		{/each}
		<div class="nav-end">
			<a href="/logout" class="btn btn-ghost btn-small sign-out">
				Sign out ↗
			</a>
		</div>
	</nav>
	<button class="hamburger" onclick={toggleMenu} aria-label="Toggle menu" aria-expanded={menuOpen}>
		<span class="ham-line"></span>
		<span class="ham-line"></span>
		<span class="ham-line"></span>
	</button>
</header>
{:else if !isPublicPage}
<header class="topbar">
	<a href="/login" class="wordmark" onclick={closeMenu}>
		<Logo size={32} />
		<span>GitSkit</span>
	</a>
	<nav class="nav desktop-nav">
		{#each infoLinks as link}
			<a href={link.href}>{link.label}</a>
		{/each}
		<div class="nav-end">
			<a href="/login" class="btn btn-primary btn-small">Sign in</a>
		</div>
	</nav>
	<button class="hamburger" onclick={toggleMenu} aria-label="Toggle menu" aria-expanded={menuOpen}>
		<span class="ham-line"></span>
		<span class="ham-line"></span>
		<span class="ham-line"></span>
	</button>
</header>
{:else}
<header class="topbar">
	<a href="/" class="wordmark" onclick={closeMenu}>
		<Logo size={32} />
		<span>GitSkit</span>
	</a>
	<nav class="nav desktop-nav">
		{#each infoLinks as link}
			<a href={link.href}>{link.label}</a>
		{/each}
		<div class="nav-end">
			<a href="/login" class="btn btn-primary btn-small">Sign in</a>
		</div>
	</nav>
	<button class="hamburger" onclick={toggleMenu} aria-label="Toggle menu" aria-expanded={menuOpen}>
		<span class="ham-line"></span>
		<span class="ham-line"></span>
		<span class="ham-line"></span>
	</button>
</header>
{/if}

{#if menuOpen}
<div class="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
	<button
		class="mobile-close"
		onclick={closeMenu}
		aria-label="Close menu"
	>✕</button>
	<div class="mobile-menu-inner">
		{#if data.user}
			{#each appLinks as link}
				<a href={link.href} onclick={closeMenu} aria-current={$page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a>
			{/each}
			<div class="mobile-divider"></div>
			{#each infoLinks as link}
				<a href={link.href} onclick={closeMenu}>{link.label}</a>
			{/each}
			<a href="/logout" onclick={closeMenu} class="mobile-signout">Sign out</a>
		{:else}
			{#each infoLinks as link}
				<a href={link.href} onclick={closeMenu}>{link.label}</a>
			{/each}
			<a href="/login" onclick={closeMenu} class="btn btn-primary" style="width:100%;text-align:center;margin-block-start:1rem;">Sign in</a>
		{/if}
	</div>
</div>
{/if}

<main class="shell">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="footer-inner">
		<span class="footer-brand">
			<Logo size={16} />
			<span>GitSkit</span>
		</span>
		<span class="footer-copy">Cut. Clip. Command. &copy; {new Date().getFullYear()} gitskit.xyz</span>
		<nav class="footer-nav" aria-label="Footer navigation">
			<a href="/about">About</a>
			<a href="/how-to">How To</a>
			<a href="/demo">Demo</a>
			<a href="https://github.com/yusufsafary/gitskit" target="_blank" rel="noopener">GitHub ↗</a>
		</nav>
	</div>
</footer>

<style>
.mobile-close {
	position: fixed;
	top: 1rem;
	right: 1.5rem;
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255,255,255,0.06);
	border: 1px solid var(--rule);
	border-radius: 50%;
	color: var(--ink-dim);
	cursor: pointer;
	font-size: 0.9rem;
	z-index: 100;
	transition: background 0.15s ease, color 0.15s ease;
}

.mobile-close:hover {
	background: rgba(255,255,255,0.1);
	color: var(--ink);
}
</style>
