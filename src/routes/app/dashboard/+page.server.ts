import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db';
import { and, eq, sql } from 'drizzle-orm';
import { workspaces, workspaceMembers, projects, tasks } from '$lib/db/schema';
import { redirect, fail } from '@sveltejs/kit';
import { slugify } from '$lib/utils';
import { projectStatusSchema, projectTitleSchema, workspaceNameSchema } from '$lib/validation';

async function getMembership(workspaceId: string, userId: string) {
	return db
		.select({ id: workspaceMembers.id, role: workspaceMembers.role })
		.from(workspaceMembers)
		.where(
			and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))
		)
		.limit(1)
		.then((rows) => rows[0] ?? null);
}

export const load: PageServerLoad = async ({ parent, locals }) => {
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

	const [projectList, workspaceTasks, memberCountRows, viewerRows] = await Promise.all([
		db.select().from(projects).where(eq(projects.workspaceId, workspace.id)),
		db
			.select({ projectId: tasks.projectId, status: tasks.status })
			.from(tasks)
			.where(eq(tasks.workspaceId, workspace.id)),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(workspaceMembers)
			.where(eq(workspaceMembers.workspaceId, workspace.id)),
		locals.user
			? db
					.select({ role: workspaceMembers.role })
					.from(workspaceMembers)
					.where(
						and(
							eq(workspaceMembers.workspaceId, workspace.id),
							eq(workspaceMembers.userId, locals.user.id)
						)
					)
					.limit(1)
			: Promise.resolve([])
	]);

	const counts = new Map<string, { total: number; done: number }>();
	for (const t of workspaceTasks) {
		if (!t.projectId) continue;
		const entry = counts.get(t.projectId) ?? { total: 0, done: 0 };
		entry.total++;
		if (t.status === 'done') entry.done++;
		counts.set(t.projectId, entry);
	}

	const projectsWithProgress = projectList.map((p) => {
		const c = counts.get(p.id);
		const progress = c && c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
		return { ...p, progress, taskTotal: c?.total ?? 0, taskDone: c?.done ?? 0 };
	});

	return {
		workspace,
		workspaces: userWorkspaces,
		projects: projectsWithProgress,
		memberCount: memberCountRows[0]?.count ?? 0,
		viewerRole: viewerRows[0]?.role ?? null
	};
};

export const actions: Actions = {
	createWorkspace: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const parsedName = workspaceNameSchema.safeParse(formData.get('workspaceName'));

		if (!parsedName.success) {
			return fail(400, { message: parsedName.error.issues[0]?.message ?? 'Invalid workspace name' });
		}

		const slug = slugify(parsedName.data);
		const uniqueSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

		try {
			await db.transaction(async (tx) => {
				const [workspace] = await tx
					.insert(workspaces)
					.values({ name: parsedName.data, slug: uniqueSlug })
					.returning();

				await tx.insert(workspaceMembers).values({
					workspaceId: workspace.id,
					userId: locals.user!.id,
					role: 'owner'
				});
			});
		} catch (e) {
			console.error('[dashboard] workspace creation failed:', e);
			return fail(500, { message: 'Failed to create workspace. Please try again.' });
		}

		throw redirect(303, '/app/dashboard');
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
			await db.insert(projects).values({
				workspaceId,
				title: parsedTitle.data,
				description: description || null
			});
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
			return fail(400, { message: parsedStatus.error.issues[0]?.message ?? 'Invalid project status' });
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
			await db
				.update(projects)
				.set({ status: parsedStatus.data })
				.where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));
		} catch (e) {
			console.error('[dashboard] project status update failed:', e);
			return fail(500, { message: 'Failed to update project status. Please try again.' });
		}

		throw redirect(303, `/app/dashboard?workspace=${workspaceId}`);
	}
};
