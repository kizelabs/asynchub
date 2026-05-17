import { env } from '$env/dynamic/private';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string, ip?: string | null): Promise<boolean> {
	const secret = env.TURNSTILE_SECRET_KEY;
	if (!secret) {
		console.warn('[turnstile] TURNSTILE_SECRET_KEY not set, skipping verification');
		return true;
	}

	try {
		const body = new URLSearchParams({
			secret,
			response: token,
			...(ip && { remoteip: ip })
		});

		const res = await fetch(VERIFY_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});

		const data = await res.json();
		return data.success === true;
	} catch (err) {
		console.error('[turnstile] Verification failed:', err);
		return false;
	}
}
