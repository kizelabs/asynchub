import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { projects } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
  const { workspace } = await parent();
  const projectList = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id))
    .orderBy(projects.createdAt);
    
  return { projects: projectList };
};
