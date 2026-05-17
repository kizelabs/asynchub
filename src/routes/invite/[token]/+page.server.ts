import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db';
import { workspaceInvitations, workspaceMembers, workspaces, user } from '$lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';

async function findInvite(token: string) {
	const [row] = await db
		.select({
			id: workspaceInvitations.id,
			workspaceId: workspaceInvitations.workspaceId,
			workspaceName: workspaces.name,
			email: workspaceInvitations.email,
			expiresAt: workspaceInvitations.expiresAt,
			acceptedAt: workspaceInvitations.acceptedAt
		})
		.from(workspaceInvitations)
		.innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
		.where(eq(workspaceInvitations.token, token))
		.limit(1);
	return row ?? null;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const invite = await findInvite(params.token);
	if (!invite) throw error(404, 'Invitation not found');

	const expired = invite.expiresAt.getTime() < Date.now();
	const alreadyAccepted = !!invite.acceptedAt;

	if (expired || alreadyAccepted) {
		return {
			invite: {
				workspaceName: invite.workspaceName,
				email: invite.email,
				state: expired ? ('expired' as const) : ('accepted' as const)
			},
			session: null
		};
	}

	// Not signed in → figure out whether the email already has an account.
	if (!locals.user) {
		const [existingUser] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, invite.email))
			.limit(1);

		const target = existingUser ? '/auth/sign-in' : '/auth/sign-up';
		const params = new URLSearchParams({
			redirect: url.pathname,
			email: invite.email
		});
		throw redirect(303, `${target}?${params.toString()}`);
	}

	// Signed in but email mismatch.
	if (locals.user.email.toLowerCase() !== invite.email.toLowerCase()) {
		return {
			invite: {
				workspaceName: invite.workspaceName,
				email: invite.email,
				state: 'email_mismatch' as const
			},
			session: { email: locals.user.email }
		};
	}

	// Already a member?
	const [existingMembership] = await db
		.select({ id: workspaceMembers.id })
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, invite.workspaceId),
				eq(workspaceMembers.userId, locals.user.id)
			)
		)
		.limit(1);
	if (existingMembership) {
		throw redirect(303, `/app/dashboard?workspace=${invite.workspaceId}`);
	}

	return {
		invite: {
			workspaceName: invite.workspaceName,
			email: invite.email,
			state: 'ready' as const
		},
		session: { email: locals.user.email }
	};
};

export const actions: Actions = {
	default: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not signed in' });

		const invite = await findInvite(params.token!);
		if (!invite) return fail(404, { message: 'Invitation not found' });
		if (invite.acceptedAt) return fail(400, { message: 'Invitation already accepted' });
		if (invite.expiresAt.getTime() < Date.now()) {
			return fail(400, { message: 'Invitation expired' });
		}
		if (locals.user.email.toLowerCase() !== invite.email.toLowerCase()) {
			return fail(403, { message: 'This invite is for a different email address' });
		}

		try {
			await db.transaction(async (tx) => {
				await tx
					.insert(workspaceMembers)
					.values({ workspaceId: invite.workspaceId, userId: locals.user!.id, role: 'member' })
					.onConflictDoNothing();

				await tx
					.update(workspaceInvitations)
					.set({ acceptedAt: new Date() })
					.where(
						and(
							eq(workspaceInvitations.id, invite.id),
							isNull(workspaceInvitations.acceptedAt)
						)
					);
			});
		} catch (e) {
			console.error('[invite.accept] failed:', e);
			return fail(500, { message: 'Failed to accept invitation' });
		}

		throw redirect(303, `/app/dashboard?workspace=${invite.workspaceId}`);
	}
};
