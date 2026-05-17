import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db';
import { and, eq } from 'drizzle-orm';
import { projects, workspaceMembers } from '$lib/db/schema';
import { redirect, fail } from '@sveltejs/kit';
import { slugify } from '$lib/utils';
import { projectStatusSchema, projectTitleSchema, workspaceNameSchema } from '$lib/validation';
import { getWorkspaceMembership } from '$lib/server/workspace-access';
import {
	createProject,
	getDashboardOverview,
	updateProjectStatus
} from '$lib/server/services/projects';
import { createWorkspaceForUser } from '$lib/server/services/workspaces';

async function getMembership(workspaceId: string, userId: string) {
	return getWorkspaceMembership(userId, workspaceId);
}

export const load: PageServerLoad = async ({ parent, locals, depends }) => {
	depends('app:tasks');
	const { workspace, workspaces: userWorkspaces } = await parent();

	if (!workspace) {
		return {
			workspace: null,
			workspaces: userWorkspaces,
			projects: [],
			memberCount: 0,
			viewerRole: null as string | null
		};
	}

	const overview = await getDashboardOverview(workspace.id, locals.user!.id);

	return {
		workspace,
		workspaces: userWorkspaces,
		projects: overview.projects,
		memberCount: overview.memberCount,
		viewerRole: overview.viewerRole
	};
};

export const actions: Actions = {
	createWorkspace: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const parsedName = workspaceNameSchema.safeParse(formData.get('workspaceName'));

		if (!parsedName.success) {
			return fail(400, {
				message: parsedName.error.issues[0]?.message ?? 'Invalid workspace name'
			});
		}

		const slug = slugify(parsedName.data);
		const uniqueSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
		let createdWorkspaceId: string;

		try {
			const workspace = await createWorkspaceForUser(locals.user.id, parsedName.data, uniqueSlug);
			createdWorkspaceId = workspace.id;
		} catch (e) {
			console.error('[dashboard] workspace creation failed:', e);
			return fail(500, { message: 'Failed to create workspace. Please try again.' });
		}

		throw redirect(303, `/app/dashboard?workspace=${createdWorkspaceId}`);
	},

	createProject: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const workspaceId = formData.get('workspaceId') as string;
		const parsedTitle = projectTitleSchema.safeParse(formData.get('title'));
		const description = ((formData.get('description') as string) ?? '').trim();

		if (!workspaceId) return fail(400, { message: 'Workspace is required' });
		if (!parsedTitle.success) {
			return fail(400, { message: parsedTitle.error.issues[0]?.message ?? 'Invalid title' });
		}

		const membership = await getMembership(workspaceId, locals.user.id);

		if (!membership) {
			return fail(403, { message: 'Not authorized to create projects in this workspace' });
		}

		try {
			await createProject(workspaceId, parsedTitle.data, description || null);
		} catch (e) {
			console.error('[dashboard] project creation failed:', e);
			return fail(500, { message: 'Failed to create project. Please try again.' });
		}

		throw redirect(303, `/app/dashboard?workspace=${workspaceId}`);
	},

	updateProjectStatus: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const workspaceId = formData.get('workspaceId') as string;
		const projectId = formData.get('projectId') as string;
		const status = formData.get('status');

		if (!workspaceId || !projectId) {
			return fail(400, { message: 'Workspace and project are required' });
		}

		const parsedStatus = projectStatusSchema.safeParse(status);
		if (!parsedStatus.success) {
			return fail(400, {
				message: parsedStatus.error.issues[0]?.message ?? 'Invalid project status'
			});
		}

		const membership = await getMembership(workspaceId, locals.user.id);
		if (!membership) {
			return fail(403, { message: 'Not authorized to update this project' });
		}

		const [existingProject] = await db
			.select({ id: projects.id })
			.from(projects)
			.where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
			.limit(1);

		if (!existingProject) {
			return fail(404, { message: 'Project not found' });
		}

		try {
			await updateProjectStatus(workspaceId, projectId, parsedStatus.data);
		} catch (e) {
			console.error('[dashboard] project status update failed:', e);
			return fail(500, { message: 'Failed to update project status. Please try again.' });
		}

		throw redirect(303, `/app/dashboard?workspace=${workspaceId}`);
	}
};
