import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import { projects, tasks, workspaceMembers, workspaces } from '$lib/db/schema';
import { projectTitleSchema, taskTitleSchema } from '$lib/validation';

async function getUserWorkspace(userId: string) {
  const row = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  return row?.workspace ?? null;
}

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

    const workspace = await getUserWorkspace(locals.user.id);
    if (!workspace) return fail(401, { message: 'No workspace found' });

    const data = await request.formData();
    const description = ((data.get('description') as string) ?? '').trim();
    const type = (data.get('type') as string) || 'project';
    const projectId = data.get('projectId') as string | null;
    const titleSchema = type === 'task' ? taskTitleSchema : projectTitleSchema;
    const parsedTitle = titleSchema.safeParse(data.get('title'));

    if (!parsedTitle.success) {
      return fail(400, { message: parsedTitle.error.issues[0]?.message ?? 'Invalid title' });
    }

    try {
      if (type === 'project') {
        await db.insert(projects).values({ title: parsedTitle.data, description: description || null, workspaceId: workspace.id });
      } else {
        await db.insert(tasks).values({ title: parsedTitle.data, status: 'todo', workspaceId: workspace.id, projectId: projectId || null });
      }
    } catch (e) {
      console.error('[create] insert failed:', e);
      return fail(500, { message: 'Failed to create. Please try again.' });
    }

    throw redirect(303, '/app/dashboard/projects');
  }
};
