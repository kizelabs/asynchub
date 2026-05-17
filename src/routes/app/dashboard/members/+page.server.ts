import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db';
import { and, eq, isNull } from 'drizzle-orm';
import { workspaceMembers, workspaceInvitations, workspaces, user } from '$lib/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { inviteEmailSchema } from '$lib/validation';
import { randomBytes } from 'crypto';
import { getWorkspaceMembership } from '$lib/server/workspace-access';
import { getMembersPageData } from '$lib/server/services/members';
import { sendEmail, buildInvitationEmail } from '$lib/server/email';
import { PUBLIC_APP_URL } from '$env/static/public';

const INVITE_TTL_DAYS = 14;

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { workspace } = await parent();
	if (!workspace) throw redirect(303, '/app/dashboard');
	if (!locals.user) throw redirect(303, '/auth/sign-in');

	const membership = await getWorkspaceForUser(locals.user.id, workspace.id);
	if (!membership) throw error(403, 'Not a member of this workspace');
	if (membership.role !== 'owner') {
		throw redirect(303, `/app/dashboard?workspace=${workspace.id}`);
	}

	const { members, invitations } = await getMembersPageData(workspace.id);

	return { workspace, members, invitations };
};

async function getWorkspaceForUser(userId: string, workspaceId: string) {
	return getWorkspaceMembership(userId, workspaceId);
}

export const actions: Actions = {
	invite: async ({ request, locals, url }) => {
		if (!locals.user) return fail(401, { invite: { message: 'Unauthorized' } });
		const workspaceId = url.searchParams.get('workspace');
		if (!workspaceId) return fail(400, { invite: { message: 'No workspace selected' } });

		const membership = await getWorkspaceForUser(locals.user.id, workspaceId);
		if (!membership) return fail(403, { invite: { message: 'Not authorized' } });
		if (membership.role !== 'owner') {
			return fail(403, { invite: { message: 'Only workspace owners can invite members.' } });
		}

		const formData = await request.formData();
		const parsedEmail = inviteEmailSchema.safeParse(formData.get('email'));

		if (!parsedEmail.success) {
			return fail(400, {
				invite: { message: parsedEmail.error.issues[0]?.message ?? 'Enter a valid email address' }
			});
		}
		const email = parsedEmail.data;

		// Is the email already a workspace member?
		const [existingMember] = await db
			.select({ id: workspaceMembers.id })
			.from(workspaceMembers)
			.innerJoin(user, eq(workspaceMembers.userId, user.id))
			.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(user.email, email)))
			.limit(1);
		if (existingMember) {
			return fail(400, { invite: { message: 'That user is already a member.' } });
		}

		const token = randomBytes(24).toString('base64url');
		const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

		try {
			await db
				.insert(workspaceInvitations)
				.values({
					workspaceId,
					email,
					token,
					invitedBy: locals.user.id,
					expiresAt
				})
				.onConflictDoUpdate({
					target: [workspaceInvitations.workspaceId, workspaceInvitations.email],
					set: {
						token,
						invitedBy: locals.user.id,
						expiresAt,
						acceptedAt: null,
						createdAt: new Date()
					}
				});
		} catch (e) {
			console.error('[members.invite] failed:', e);
			return fail(500, { invite: { message: 'Failed to create invitation.' } });
		}

		// Send invitation email via Resend
		const inviteUrl = `${PUBLIC_APP_URL}/invite/${token}`;
		const [workspace] = await db
			.select({ name: workspaces.name })
			.from(workspaces)
			.where(eq(workspaces.id, workspaceId))
			.limit(1);
		const workspaceName = workspace?.name ?? 'a workspace';
		const inviterName = locals.user.name;

		const { subject, html } = buildInvitationEmail(inviteUrl, workspaceName, inviterName);
		void sendEmail({ to: email, subject, html });

		return { invite: { success: true as const, email, token } };
	},

	revoke: async ({ request, locals, url }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const workspaceId = url.searchParams.get('workspace');
		if (!workspaceId) return fail(400, { message: 'No workspace selected' });

		const membership = await getWorkspaceForUser(locals.user.id, workspaceId);
		if (!membership) return fail(403, { message: 'Not authorized' });
		if (membership.role !== 'owner') {
			return fail(403, { message: 'Only workspace owners can revoke invitations.' });
		}

		const formData = await request.formData();
		const invitationId = formData.get('invitationId') as string;
		if (!invitationId) return fail(400, { message: 'Missing invitation id' });

		try {
			await db
				.delete(workspaceInvitations)
				.where(
					and(
						eq(workspaceInvitations.id, invitationId),
						eq(workspaceInvitations.workspaceId, workspaceId)
					)
				);
		} catch (e) {
			console.error('[members.revoke] failed:', e);
			return fail(500, { message: 'Failed to revoke invitation.' });
		}

		return { success: true };
	},

	removeMember: async ({ request, locals, url }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const workspaceId = url.searchParams.get('workspace');
		if (!workspaceId) return fail(400, { message: 'No workspace selected' });

		const membership = await getWorkspaceForUser(locals.user.id, workspaceId);
		if (!membership) return fail(403, { message: 'Not authorized' });
		if (membership.role !== 'owner') {
			return fail(403, { message: 'Only workspace owners can remove members.' });
		}

		const formData = await request.formData();
		const memberId = formData.get('memberId') as string;
		if (!memberId) return fail(400, { message: 'Missing member id' });
		if (memberId === locals.user.id) {
			return fail(400, { message: 'You cannot remove yourself from this workspace.' });
		}

		const targetMembership = await getWorkspaceForUser(memberId, workspaceId);
		if (!targetMembership) {
			return fail(404, { message: 'Member not found' });
		}
		if (targetMembership.role === 'owner') {
			return fail(400, { message: 'Workspace owners cannot be removed.' });
		}

		try {
			await db
				.delete(workspaceMembers)
				.where(
					and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberId))
				);
		} catch (e) {
			console.error('[members.remove] failed:', e);
			return fail(500, { message: 'Failed to remove member.' });
		}

		return { success: true };
	}
};
