import { db } from '$lib/db';
import { user, workspaceInvitations, workspaceMembers } from '$lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export async function getWorkspaceMembers(workspaceId: string) {
	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: workspaceMembers.role,
			joinedAt: workspaceMembers.joinedAt
		})
		.from(workspaceMembers)
		.innerJoin(user, eq(workspaceMembers.userId, user.id))
		.where(eq(workspaceMembers.workspaceId, workspaceId))
		.orderBy(workspaceMembers.joinedAt);
}

export async function getPendingInvitations(workspaceId: string) {
	return db
		.select({
			id: workspaceInvitations.id,
			email: workspaceInvitations.email,
			token: workspaceInvitations.token,
			invitedBy: workspaceInvitations.invitedBy,
			expiresAt: workspaceInvitations.expiresAt,
			createdAt: workspaceInvitations.createdAt
		})
		.from(workspaceInvitations)
		.where(
			and(
				eq(workspaceInvitations.workspaceId, workspaceId),
				isNull(workspaceInvitations.acceptedAt)
			)
		)
		.orderBy(workspaceInvitations.createdAt);
}

export async function getMembersPageData(workspaceId: string) {
	const [members, invitations] = await Promise.all([
		getWorkspaceMembers(workspaceId),
		getPendingInvitations(workspaceId)
	]);

	return { members, invitations };
}
