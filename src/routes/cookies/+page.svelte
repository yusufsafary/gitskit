<svelte:head>
	<title>Cookies Policy - GitSkit</title>
	<meta name="description" content="GitSkit cookie and privacy policy." />
</svelte:head>

<section class="hero">
	<h1>Cookie <mark>Policy</mark>.</h1>
	<p>What GitSkit stores in your browser and why.</p>
</section>

<hr class="rule" />

<section class="prose stack" style="max-width:72ch;">
	<p>Last updated: July 2026.</p>

	<h2>What we store</h2>
	<p>
		GitSkit uses a single session cookie to keep you signed in. That is the only cookie this
		application sets.
	</p>

	<div class="card" style="margin-block:1.5rem;">
		<div class="table-wrap" style="border:none;">
			<table>
				<thead>
					<tr>
						<th>Cookie name</th>
						<th>Purpose</th>
						<th>Duration</th>
						<th>Type</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>gitskit_session</code></td>
						<td>Authenticates your session after sign-in (password or Solana wallet)</td>
						<td>7 days</td>
						<td>HttpOnly, Secure, SameSite=Lax</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<h2>What we do not store</h2>
	<p>GitSkit does not use:</p>
	<ul>
		<li>Analytics cookies or tracking pixels</li>
		<li>Advertising cookies</li>
		<li>Third-party cookies of any kind</li>
		<li>Local storage beyond what the browser itself uses</li>
	</ul>

	<h2>Session cookie details</h2>
	<p>
		The <code>gitskit_session</code> cookie contains an HMAC-signed token that encodes your
		session identity and expiry. It is never sent to third parties. The token is signed with a
		secret key you control (<code>GITSKIT_SECRET</code> environment variable). No personal data
		is stored inside the token beyond a session ID.
	</p>
	<p>
		The cookie is flagged <code>HttpOnly</code> (not accessible to JavaScript),
		<code>Secure</code> (only sent over HTTPS), and <code>SameSite=Lax</code> (not sent on
		cross-site requests unless you navigate directly to the site).
	</p>

	<h2>Wallet sign-in</h2>
	<p>
		When you sign in with a Solana wallet, your wallet's public key is used as a session
		identifier. No private key is ever transmitted or stored. The public key is not shared
		with any third party.
	</p>

	<h2>Clearing your session</h2>
	<p>
		Click "Sign out" in the navigation to delete the session cookie immediately. You can also
		clear it manually from your browser's devtools under Application - Cookies.
	</p>

	<h2>Contact</h2>
	<p>
		This is a self-hosted tool. Cookie behavior is determined by whoever operates the instance
		you are using. For questions, contact your instance administrator.
	</p>
</section>

<hr class="rule" />

<section>
	<div class="row">
		<a href="/about" class="btn btn-ghost">About GitSkit</a>
		<a href="/how-to" class="btn btn-ghost">How To</a>
	</div>
</section>
