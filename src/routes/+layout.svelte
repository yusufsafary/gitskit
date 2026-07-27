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
		<Logo size={30} />
		Git<mark>Skit</mark>
	</a>
	<nav class="nav desktop-nav" aria-label="Primary navigation">
		{#each appLinks as link}
			<a
				href={link.href}
				aria-current={$page.url.pathname === link.href ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
		<span class="nav-divider"></span>
		{#each infoLinks.slice(0, 3) as link}
			<a
				href={link.href}
				aria-current={$page.url.pathname === link.href ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
		<a href="/logout" class="btn-small btn-ghost sign-out">
			Sign out
		</a>
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
		<Logo size={30} />
		Git<mark>Skit</mark>
	</a>
	<nav class="nav desktop-nav">
		{#each infoLinks as link}
			<a href={link.href}>{link.label}</a>
		{/each}
		<a href="/login" class="btn-small btn-primary">Sign in</a>
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
		<Logo size={30} />
		Git<mark>Skit</mark>
	</a>
	<nav class="nav desktop-nav">
		{#each infoLinks as link}
			<a href={link.href}>{link.label}</a>
		{/each}
		<a href="/login" class="btn-small btn-primary">Sign in</a>
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
			<a href="/login" onclick={closeMenu} class="btn btn-primary" style="width:100%;text-align:center;margin-block-start:0.5rem;">Sign in</a>
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
			<Logo size={20} />
			<span>GitSkit</span>
		</span>
		<span class="footer-copy">Cut. Clip. Command. &copy; {new Date().getFullYear()} gitscity.xyz</span>
		<nav class="footer-nav" aria-label="Footer navigation">
			<a href="/about">About</a>
			<a href="/how-to">How To</a>
			<a href="/demo">Demo</a>
		</nav>
	</div>
</footer>

<style>
.site-footer {
	border-block-start: 1px solid var(--rule);
	padding-block: 1.25rem;
	padding-inline: var(--gutter);
	margin-block-start: auto;
}
.footer-inner {
	max-width: 1800px;
	margin-inline: auto;
	display: flex;
	align-items: center;
	gap: 1.5rem;
	flex-wrap: wrap;
}
.footer-brand {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	font-weight: 700;
	font-size: var(--fs-small);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--ink-dim);
	flex-shrink: 0;
}
.footer-copy {
	font-size: var(--fs-small);
	color: var(--muted);
	flex: 1;
}
.footer-nav {
	display: flex;
	gap: 1rem;
}
.footer-nav a {
	font-size: var(--fs-small);
	color: var(--muted);
	text-transform: uppercase;
	letter-spacing: var(--tracking-caps);
	font-weight: 600;
	text-decoration: none;
}
.footer-nav a:hover {
	color: var(--accent);
	background: none;
}

/* Hamburger */
.hamburger {
	display: none;
	flex-direction: column;
	gap: 5px;
	background: none;
	border: none;
	cursor: pointer;
	padding: 0.5rem;
	margin-inline-start: auto;
}
.ham-line {
	display: block;
	width: 22px;
	height: 2px;
	background: var(--ink);
	border-radius: 2px;
}

/* Mobile menu overlay */
.mobile-menu {
	position: fixed;
	inset-inline: 0;
	top: 3.5rem;
	bottom: 0;
	z-index: 999;
	background: var(--bg-2);
	border-block-start: 1px solid var(--rule);
	overflow-y: auto;
}
.mobile-menu-inner {
	display: flex;
	flex-direction: column;
	padding: 1.5rem var(--gutter) 2rem;
}
.mobile-menu-inner a {
	display: block;
	padding-block: 0.9rem;
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--ink);
	border-block-end: 1px solid var(--rule);
	text-decoration: none;
}
.mobile-menu-inner a:hover {
	color: var(--accent);
	background: none;
}
.mobile-menu-inner a[aria-current='page'] {
	color: var(--accent);
}
.mobile-divider {
	border: none;
	border-block-start: 2px solid var(--rule);
	margin-block: 0.25rem;
}
.mobile-signout {
	color: var(--muted) !important;
	font-size: var(--fs-small) !important;
	padding-block: 0.75rem !important;
}
.nav-divider {
	display: inline-block;
	width: 1px;
	height: 1.2rem;
	margin-inline: 0.25rem;
	background: var(--rule);
	align-self: center;
}
.sign-out {
	margin-inline-start: 0.5rem;
}
.desktop-nav {
	display: flex;
}

@media (max-width: 768px) {
	.desktop-nav {
		display: none;
	}
	.hamburger {
		display: flex;
	}
}

@media (max-width: 480px) {
	.footer-inner {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.footer-copy {
		flex: none;
	}
}
</style>
