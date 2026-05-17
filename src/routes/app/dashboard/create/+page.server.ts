import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import { and, eq } from 'drizzle-orm';
import { projects } from '$lib/db/schema';
import { projectTitleSchema, taskTitleSchema } from '$lib/validation';
import { createProject } from '$lib/server/services/projects';
import { createTask } from '$lib/server/services/tasks';
import { getWorkspaceMembership } from '$lib/server/workspace-access';

export const load: PageServerLoad = async ({ parent }) => {
	const { workspace } = await parent();
	if (!workspace) {
		throw redirect(303, '/app/dashboard');
	}

	const projectList = await db
		.select()
		.from(projects)
		.where(eq(projects.workspaceId, workspace.id))
		.orderBy(projects.createdAt);

	return { workspace, projects: projectList };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const data = await request.formData();
		const workspaceId = data.get('workspaceId') as string;
		const description = ((data.get('description') as string) ?? '').trim();
		const type = (data.get('type') as string) || 'project';
		const projectId = data.get('projectId') as string | null;
		const titleSchema = type === 'task' ? taskTitleSchema : projectTitleSchema;
		const parsedTitle = titleSchema.safeParse(data.get('title'));

		if (!workspaceId) return fail(400, { message: 'Workspace is required' });
		if (!parsedTitle.success) {
			return fail(400, { message: parsedTitle.error.issues[0]?.message ?? 'Invalid title' });
		}

		const membership = await getWorkspaceMembership(locals.user.id, workspaceId);
		if (!membership) return fail(403, { message: 'Not authorized for this workspace' });

		if (type === 'task' && projectId) {
			const [project] = await db
				.select({ id: projects.id })
				.from(projects)
				.where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
				.limit(1);

			if (!project) {
				return fail(400, { message: 'Project does not belong to this workspace' });
			}
		}

		try {
			if (type === 'project') {
				await createProject(workspaceId, parsedTitle.data, description || null);
			} else {
				await createTask(workspaceId, parsedTitle.data, projectId || null);
			}
		} catch (e) {
			console.error('[create] insert failed:', e);
			return fail(500, { message: 'Failed to create. Please try again.' });
		}

		throw redirect(303, `/app/dashboard/projects?workspace=${workspaceId}`);
	}
};
