import { db } from '$lib/db';
import { workspaceMembers, workspaces } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export async function listUserWorkspaces(userId: string) {
	return db
		.select({ workspace: workspaces })
		.from(workspaceMembers)
		.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
		.where(eq(workspaceMembers.userId, userId))
		.orderBy(workspaces.createdAt);
}

export async function getUserWorkspaceState(userId: string, workspaceIdParam: string | null) {
	const workspaceRows = await listUserWorkspaces(userId);
	const workspacesForUser = workspaceRows.map((row) => row.workspace);
	const activeWorkspace =
		(workspaceIdParam
			? workspacesForUser.find((workspace) => workspace.id === workspaceIdParam)
			: null) ??
		workspacesForUser[0] ??
		null;

	return {
		workspaces: workspacesForUser,
		activeWorkspace
	};
}

export async function createWorkspaceForUser(userId: string, name: string, slug: string) {
	return db.transaction(async (tx) => {
		const [workspace] = await tx.insert(workspaces).values({ name, slug }).returning();

		await tx.insert(workspaceMembers).values({
			workspaceId: workspace.id,
			userId,
			role: 'owner'
		});

		return workspace;
	});
}
