import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import { workspaceMembers, user } from '$lib/db/schema';

export const load: PageServerLoad = async ({ parent }) => {
  const { workspace } = await parent();
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      //avatarUrl: user.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(eq(workspaceMembers.workspaceId, workspace.id))
    .orderBy(workspaceMembers.joinedAt);
    
  return { members };
};
