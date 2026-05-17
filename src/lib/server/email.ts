import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const resend = new Resend(env.RESEND_API_KEY);

const from = env.RESEND_FROM_EMAIL || 'AsyncHub <noreply@asynchub.app>';

interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
	try {
		const { error, data } = await resend.emails.send({
			from,
			to,
			subject,
			html
		});

		if (error) {
			console.error('[email] Resend API error:', JSON.stringify(error));
			throw new Error(`Failed to send email: ${error.message}`);
		}

		console.log('[email] Sent successfully to:', to, 'id:', data?.id);
	} catch (err) {
		console.error('[email] Exception sending to:', to, err);
		throw err;
	}
}

export function buildVerificationEmail(url: string, userName?: string) {
	const name = userName || 'there';
	return {
		subject: 'Verify your email address',
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px;">Verify your email</h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Hi ${name}, click the button below to verify your email address and activate your AsyncHub account.
    </p>
    <a href="${url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
      Verify Email
    </a>
    <p style="font-size: 13px; color: #9ca3af; margin: 24px 0 0; line-height: 1.5;">
      If you didn't create an account, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`
	};
}

export function buildPasswordResetEmail(url: string, userName?: string) {
	const name = userName || 'there';
	return {
		subject: 'Reset your password',
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px;">Reset your password</h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Hi ${name}, we received a request to reset your password. Click the button below to choose a new one.
    </p>
    <a href="${url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
      Reset Password
    </a>
    <p style="font-size: 13px; color: #9ca3af; margin: 24px 0 0; line-height: 1.5;">
      If you didn't request a password reset, you can safely ignore this email. The link expires in 1 hour.
    </p>
  </div>
</body>
</html>`
	};
}

export function buildInvitationEmail(
	inviteUrl: string,
	workspaceName: string,
	inviterName?: string
) {
	const invitedBy = inviterName ? ` by ${inviterName}` : '';
	return {
		subject: `You're invited to join ${workspaceName} on AsyncHub`,
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px;">You're invited!</h1>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      You've been invited${invitedBy} to join <strong>${workspaceName}</strong> on AsyncHub. Click below to accept the invitation.
    </p>
    <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
      Accept Invitation
    </a>
    <p style="font-size: 13px; color: #9ca3af; margin: 24px 0 0; line-height: 1.5;">
      This invitation expires in 14 days. If you weren't expecting this, you can ignore it.
    </p>
  </div>
</body>
</html>`
	};
}
