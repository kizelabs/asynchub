import type { RequestHandler } from './$types';
import { verifyTurnstileToken } from '$lib/server/turnstile';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { token } = await request.json();

	if (!token) {
		return json({ success: false, error: 'Missing captcha token' }, { status: 400 });
	}

	const ip = getClientAddress();
	const success = await verifyTurnstileToken(token, ip);

	if (!success) {
		return json({ success: false, error: 'Captcha verification failed' }, { status: 403 });
	}

	return json({ success: true });
};
