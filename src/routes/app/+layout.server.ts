import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { workspaceMembers, workspaces } from '$lib/db/schema';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/auth/sign-in');
  }

  const membership = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, locals.user.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    throw redirect(302, '/onboarding');
  }

  locals.workspace = membership.workspace;

  return {
    user: locals.user,
    workspace: membership.workspace,
  };
};
