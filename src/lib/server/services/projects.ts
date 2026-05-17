import { db } from '$lib/db';
import { projects, tasks, workspaceMembers } from '$lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';

type TaskStatusRow = {
	projectId: string | null;
	status: string;
};

function withProjectProgress<
	TProject extends {
		id: string;
	}
>(projectList: TProject[], taskRows: TaskStatusRow[]) {
	const counts = new Map<string, { total: number; done: number }>();

	for (const task of taskRows) {
		if (!task.projectId) continue;
		const entry = counts.get(task.projectId) ?? { total: 0, done: 0 };
		entry.total += 1;
		if (task.status === 'done') entry.done += 1;
		counts.set(task.projectId, entry);
	}

	return projectList.map((project) => {
		const count = counts.get(project.id);
		const progress = count && count.total > 0 ? Math.round((count.done / count.total) * 100) : 0;

		return {
			...project,
			progress,
			taskTotal: count?.total ?? 0,
			taskDone: count?.done ?? 0
		};
	});
}

export async function getWorkspaceProjectsWithProgress(workspaceId: string) {
	const [projectList, taskRows] = await Promise.all([
		db
			.select()
			.from(projects)
			.where(eq(projects.workspaceId, workspaceId))
			.orderBy(projects.createdAt),
		db
			.select({ projectId: tasks.projectId, status: tasks.status })
			.from(tasks)
			.where(eq(tasks.workspaceId, workspaceId))
	]);

	return withProjectProgress(projectList, taskRows);
}

export async function getDashboardOverview(workspaceId: string, userId: string) {
	const [projectList, memberCountRows, viewerRows] = await Promise.all([
		getWorkspaceProjectsWithProgress(workspaceId),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(workspaceMembers)
			.where(eq(workspaceMembers.workspaceId, workspaceId)),
		db
			.select({ role: workspaceMembers.role })
			.from(workspaceMembers)
			.where(
				and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))
			)
			.limit(1)
	]);

	return {
		projects: projectList,
		memberCount: memberCountRows[0]?.count ?? 0,
		viewerRole: viewerRows[0]?.role ?? null
	};
}

export async function listWorkspaceProjects(workspaceId: string) {
	return db
		.select({
			id: projects.id,
			title: projects.title
		})
		.from(projects)
		.where(eq(projects.workspaceId, workspaceId))
		.orderBy(projects.createdAt);
}

export async function getWorkspaceProject(workspaceId: string, projectId: string) {
	return db
		.select({
			id: projects.id,
			title: projects.title,
			description: projects.description
		})
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
		.limit(1)
		.then((rows) => rows[0] ?? null);
}

export async function createProject(
	workspaceId: string,
	title: string,
	description: string | null
) {
	return db.insert(projects).values({
		workspaceId,
		title,
		description
	});
}

export async function updateProjectStatus(workspaceId: string, projectId: string, status: string) {
	return db
		.update(projects)
		.set({ status })
		.where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)));
}
