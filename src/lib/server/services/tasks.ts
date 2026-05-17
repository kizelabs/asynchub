import { db } from '$lib/db';
import {
	projects,
	taskActivityLog,
	taskAssignees,
	tasks,
	user,
	workspaceMembers
} from '$lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export async function listWorkspaceTasksWithAssignees(workspaceId: string) {
	const [taskRows, assigneeRows] = await Promise.all([
		db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
		db
			.select({
				taskId: taskAssignees.taskId,
				userId: taskAssignees.userId
			})
			.from(taskAssignees)
			.innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
			.where(eq(tasks.workspaceId, workspaceId))
	]);

	const assigneesByTask = assigneeRows.reduce((acc: Record<string, string[]>, row) => {
		acc[row.taskId] ??= [];
		acc[row.taskId].push(row.userId);
		return acc;
	}, {});

	return taskRows.map((task) => ({
		...task,
		assigneeIds: assigneesByTask[task.id] ?? []
	}));
}

export async function listWorkspaceMembers(workspaceId: string) {
	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image
		})
		.from(workspaceMembers)
		.innerJoin(user, eq(workspaceMembers.userId, user.id))
		.where(eq(workspaceMembers.workspaceId, workspaceId))
		.orderBy(workspaceMembers.joinedAt);
}

export async function getTaskBoardData(workspaceId: string, projectId: string | null) {
	const [project, members, initialTasks, projectList] = await Promise.all([
		projectId ? getWorkspaceProjectSummary(workspaceId, projectId) : Promise.resolve(null),
		listWorkspaceMembers(workspaceId),
		listWorkspaceTasksWithAssignees(workspaceId),
		db
			.select({
				id: projects.id,
				title: projects.title
			})
			.from(projects)
			.where(eq(projects.workspaceId, workspaceId))
			.orderBy(projects.createdAt)
	]);

	return {
		project,
		projects: projectList,
		initialTasks,
		members
	};
}

async function getWorkspaceProjectSummary(workspaceId: string, projectId: string) {
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

export async function getTaskActivity(taskId: string) {
	return db
		.select({
			id: taskActivityLog.id,
			action: taskActivityLog.action,
			oldValue: taskActivityLog.oldValue,
			newValue: taskActivityLog.newValue,
			createdAt: taskActivityLog.createdAt,
			userId: taskActivityLog.userId,
			userName: user.name,
			userEmail: user.email,
			userImage: user.image
		})
		.from(taskActivityLog)
		.leftJoin(user, eq(taskActivityLog.userId, user.id))
		.where(eq(taskActivityLog.taskId, taskId))
		.orderBy(desc(taskActivityLog.createdAt));
}

export async function createTask(
	workspaceId: string,
	title: string,
	projectId: string | null = null
) {
	return db.insert(tasks).values({
		title,
		status: 'todo',
		workspaceId,
		projectId
	});
}
