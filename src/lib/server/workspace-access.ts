import { db } from '$lib/db';
import { tasks, workspaceMembers } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
	return db
		.select({
			id: workspaceMembers.id,
			role: workspaceMembers.role
		})
		.from(workspaceMembers)
		.where(
			and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))
		)
		.limit(1)
		.then((rows) => rows[0] ?? null);
}

export async function getTaskForWorkspaceMember(taskId: string, userId: string) {
	return db
		.select({
			id: tasks.id,
			workspaceId: tasks.workspaceId,
			status: tasks.status
		})
		.from(tasks)
		.innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, tasks.workspaceId))
		.where(and(eq(tasks.id, taskId), eq(workspaceMembers.userId, userId)))
		.limit(1)
		.then((rows) => rows[0] ?? null);
}
