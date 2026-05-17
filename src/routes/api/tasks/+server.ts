import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { projects, taskActivityLog, taskAssignees, tasks, workspaceMembers } from '$lib/db/schema';
import { taskStatusSchema, taskTitleSchema } from '$lib/validation';
import { getWorkspaceMembership } from '$lib/server/workspace-access';
import { and, eq, inArray, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { title, workspaceId, projectId, assigneeIds } = body;

	if (!title || !workspaceId) {
		return Response.json({ error: 'Missing title or workspaceId' }, { status: 400 });
	}

	const parsedTitle = taskTitleSchema.safeParse(title);
	if (!parsedTitle.success) {
		return Response.json(
			{ error: parsedTitle.error.issues[0]?.message ?? 'Invalid task title' },
			{ status: 400 }
		);
	}

	const membership = await getWorkspaceMembership(locals.user.id, workspaceId);
	if (!membership) {
		return Response.json({ error: 'Forbidden' }, { status: 403 });
	}

	if (projectId) {
		const [project] = await db
			.select({ id: projects.id })
			.from(projects)
			.where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
			.limit(1);

		if (!project) {
			return Response.json({ error: 'Invalid project' }, { status: 400 });
		}
	}

	const ids: string[] = Array.isArray(assigneeIds)
		? Array.from(
				new Set(assigneeIds.filter((id): id is string => typeof id === 'string' && id.length > 0))
			)
		: [];

	if (ids.length > 0) {
		const memberRows = await db
			.select({ userId: workspaceMembers.userId })
			.from(workspaceMembers)
			.where(
				and(eq(workspaceMembers.workspaceId, workspaceId), inArray(workspaceMembers.userId, ids))
			);

		if (memberRows.length !== ids.length) {
			return Response.json({ error: 'Assignees must belong to the workspace' }, { status: 400 });
		}
	}

	const task = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(tasks)
			.values({
				title: parsedTitle.data,
				workspaceId,
				projectId: projectId ?? null,
				status: 'todo',
				version: 1
			})
			.returning();

		if (ids.length > 0) {
			await tx.insert(taskAssignees).values(ids.map((userId) => ({ taskId: created.id, userId })));
		}

		await tx.insert(taskActivityLog).values({
			taskId: created.id,
			userId: locals.user?.id ?? null,
			action: 'created',
			oldValue: null,
			newValue: parsedTitle.data
		});

		if (ids.length > 0) {
			await tx.insert(taskActivityLog).values({
				taskId: created.id,
				userId: locals.user?.id ?? null,
				action: 'assignees_added',
				oldValue: null,
				newValue: ids.join(',')
			});
		}

		return created;
	});

	return Response.json({ ...task, assigneeIds: ids });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { id, status } = body;

	if (!id || !status) {
		return Response.json({ error: 'Missing id or status' }, { status: 400 });
	}

	const parsedStatus = taskStatusSchema.safeParse(status);
	if (!parsedStatus.success) {
		return Response.json(
			{ error: parsedStatus.error.issues[0]?.message ?? 'Invalid task status' },
			{ status: 400 }
		);
	}

	const actorId = locals.user.id;

	const task = await db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ id: tasks.id, workspaceId: tasks.workspaceId, status: tasks.status })
			.from(tasks)
			.where(eq(tasks.id, id))
			.limit(1);

		if (!existing) return null;

		const [member] = await tx
			.select({ id: workspaceMembers.id })
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, existing.workspaceId),
					eq(workspaceMembers.userId, actorId)
				)
			)
			.limit(1);

		if (!member) return 'forbidden';

		const [updated] = await tx
			.update(tasks)
			.set({ status: parsedStatus.data, version: sql`version + 1`, updatedAt: new Date() })
			.where(and(eq(tasks.id, id), eq(tasks.workspaceId, existing.workspaceId)))
			.returning();

		if (existing.status !== parsedStatus.data) {
			await tx.insert(taskActivityLog).values({
				taskId: id,
				userId: actorId,
				action: 'status_changed',
				oldValue: existing.status,
				newValue: parsedStatus.data
			});
		}

		return updated;
	});

	if (task === 'forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
	if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
	return Response.json(task);
};
