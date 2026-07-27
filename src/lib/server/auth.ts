import { randomBytes, createHmac } from 'node:crypto';

export const COOKIE_NAME = 'gitskit_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * In-memory nonce store for wallet sign-in challenges.
 * Fine for single-instance; for multi-instance use Redis.
 */
const nonces = new Map<string, { value: string; exp: number }>();

export function generateNonce(walletAddress: string): string {
	const nonce = randomBytes(16).toString('hex');
	nonces.set(walletAddress, { value: nonce, exp: Date.now() + 5 * 60 * 1000 });
	return nonce;
}

export function consumeNonce(walletAddress: string, nonce: string): boolean {
	const entry = nonces.get(walletAddress);
	if (!entry) return false;
	if (Date.now() > entry.exp) {
		nonces.delete(walletAddress);
		return false;
	}
	if (entry.value !== nonce) return false;
	nonces.delete(walletAddress);
	return true;
}

function secret(): string {
	return process.env.GITSKIT_SECRET ?? 'gitskit-dev-secret-change-in-production';
}

export function createSessionToken(userId: string): string {
	const payload = Buffer.from(
		JSON.stringify({ u: userId, e: Date.now() + SESSION_TTL_MS })
	).toString('base64url');
	const sig = createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, 22);
	return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
	try {
		const dot = token.lastIndexOf('.');
		if (dot === -1) return null;
		const payload = token.slice(0, dot);
		const sig = token.slice(dot + 1);
		const expected = createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, 22);
		if (sig !== expected) return null;
		const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
		if (typeof data.e !== 'number' || Date.now() > data.e) return null;
		return data.u as string;
	} catch {
		return null;
	}
}

export function checkPassword(input: string): boolean {
	const pwd = process.env.GITSKIT_PASSWORD;
	if (!pwd || pwd.trim() === '') return true; // open in dev mode
	return input === pwd;
}

/**
 * Verify a Solana wallet signature (ed25519).
 * The wallet signs a UTF-8 message; we verify with tweetnacl.
 */
export async function verifyWalletSignature(
	walletAddress: string,
	message: string,
	signatureHex: string
): Promise<boolean> {
	try {
		// Dynamically import to keep tree-shaking happy
		const nacl = await import('tweetnacl');
		const bs58 = await import('bs58');

		const pubkeyBytes = bs58.default.decode(walletAddress);
		const msgBytes = new TextEncoder().encode(message);
		const sigBytes = Buffer.from(signatureHex, 'hex');

		return nacl.default.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);
	} catch {
		return false;
	}
}
