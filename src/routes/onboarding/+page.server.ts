import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import { workspaces, workspaceMembers } from '$lib/db/schema';
import { slugify } from '$lib/utils';
import { workspaceNameSchema } from '$lib/validation';
import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) throw redirect(302, '/auth/sign-in');

	const existing = await db
		.select()
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, session.user.id))
		.limit(1);

	if (existing.length) throw redirect(302, '/app/dashboard');

	return { user: session.user };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) return fail(401, { message: 'Unauthorized' });

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
					userId: session.user.id,
					role: 'owner'
				});
			});
		} catch (e) {
			console.error('[onboarding] workspace creation failed:', e);
			return fail(500, { message: 'Failed to create workspace. Please try again.' });
		}

		throw redirect(302, '/app/dashboard');
	}
};
