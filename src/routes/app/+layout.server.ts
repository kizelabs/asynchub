import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserWorkspaceState } from '$lib/server/services/workspaces';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/sign-in');
	}

	const { workspaces, activeWorkspace } = await getUserWorkspaceState(
		locals.user.id,
		url.searchParams.get('workspace')
	);

	if (workspaces.length === 0) {
		throw redirect(302, '/onboarding');
	}

	// Set workspace in locals only if it was explicitly selected
	if (activeWorkspace) {
		locals.workspace = activeWorkspace;
	}

	return {
		user: locals.user,
		workspace: activeWorkspace,
		workspaces
	};
};
