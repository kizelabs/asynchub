import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getTaskBoardData } from '$lib/server/services/tasks';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { workspace } = await parent();

	if (!workspace) {
		throw redirect(303, '/app/dashboard');
	}

	const projectId = url.searchParams.get('project');

	return getTaskBoardData(workspace.id, projectId);
};
