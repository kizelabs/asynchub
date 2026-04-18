import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { projects, tasks } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
  const { workspace } = await parent();
  // 1. Fetch projects
  const projectList = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id))
    .orderBy(projects.createdAt);

  // 2. Fetch tasks for this workspace
  const taskList = await db
    .select({ projectId: tasks.projectId, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspace.id));

  // 3. Calculate progress per project
  const progressMap = taskList.reduce((acc, t) => {
    if (!t.projectId) return acc;
    if (!acc[t.projectId]) acc[t.projectId] = { total: 0, done: 0 };
    acc[t.projectId].total++;
    if (t.status === 'done') acc[t.projectId].done++;
    return acc;
  }, {} as Record<string, { total: number; done: number }>);

  // 4. Attach calculated progress to projects
  const projectsWithProgress = projectList.map(p => ({
    ...p,
    progress: progressMap[p.id]?.total 
      ? Math.round((progressMap[p.id].done / progressMap[p.id].total) * 100)
      : 0
  }));

  return { projects: projectsWithProgress };
};
