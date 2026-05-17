import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getWorkspaceProjectsWithProgress } from '$lib/server/services/projects';

export const load: PageServerLoad = async ({ parent, depends }) => {
	depends('app:tasks');
	const { workspace } = await parent();
	if (!workspace) {
		throw redirect(303, '/app/dashboard');
	}
	return { projects: await getWorkspaceProjectsWithProgress(workspace.id) };
};
