import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { tasks } from '$lib/db/schema';
import { getTaskForWorkspaceMember } from '$lib/server/workspace-access';
import { getTaskActivity } from '$lib/server/services/tasks';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	const taskId = params.id;
	if (!taskId) return Response.json({ error: 'Missing task id' }, { status: 400 });
	if (!locals.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

	const task = await getTaskForWorkspaceMember(taskId, locals.user.id);
	if (!task) {
		const exists = await db
			.select({ id: tasks.id })
			.from(tasks)
			.where(eq(tasks.id, taskId))
			.limit(1)
			.then((rows) => rows[0] ?? null);

		return Response.json(
			{ error: exists ? 'Forbidden' : 'Task not found' },
			{ status: exists ? 403 : 404 }
		);
	}

	return Response.json({ activity: await getTaskActivity(taskId) });
};
