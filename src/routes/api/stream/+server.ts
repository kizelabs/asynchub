// src/routes/api/stream/+server.ts
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { projects } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { getWorkspaceMembership } from '$lib/server/workspace-access';
import { listWorkspaceTasksWithAssignees } from '$lib/server/services/tasks';

type ProgressMap = Record<string, { total: number; done: number }>;

async function computeProgress(
	workspaceId: string,
	tasks: Awaited<ReturnType<typeof listWorkspaceTasksWithAssignees>>
): Promise<ProgressMap> {
	const projectRows = await db
		.select({ id: projects.id })
		.from(projects)
		.where(eq(projects.workspaceId, workspaceId));

	const progress: ProgressMap = {};
	for (const p of projectRows) progress[p.id] = { total: 0, done: 0 };
	for (const t of tasks) {
		if (!t.projectId) continue;
		const entry = progress[t.projectId] ?? { total: 0, done: 0 };
		entry.total++;
		if (t.status === 'done') entry.done++;
		progress[t.projectId] = entry;
	}
	return progress;
}

export const GET: RequestHandler = async ({ url, setHeaders, locals }) => {
	const workspaceId = url.searchParams.get('workspace');
	if (!workspaceId) return new Response('Missing workspace', { status: 400 });
	if (!locals.user) return new Response('Unauthorized', { status: 401 });

	const membership = await getWorkspaceMembership(locals.user.id, workspaceId);
	if (!membership) return new Response('Forbidden', { status: 403 });

	setHeaders({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no'
	});

	let lastVersion = 0;
	const encoder = new TextEncoder();
	let ping: ReturnType<typeof setInterval>;
	let poll: ReturnType<typeof setInterval>;
	let closed = false;

	const send = (controller: ReadableStreamDefaultController<Uint8Array>, payload: unknown) => {
		if (closed || controller.desiredSize === null) return;
		controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
	};

	const sendError = (
		controller: ReadableStreamDefaultController<Uint8Array>,
		phase: 'init' | 'sync',
		err: unknown
	) => {
		const message = err instanceof Error ? err.message : 'Unknown stream error';
		send(controller, { type: 'ERROR', phase, message });
	};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			(async () => {
				try {
					const initial = await listWorkspaceTasksWithAssignees(workspaceId);
					lastVersion = initial.reduce((max, task) => Math.max(max, task.version), 0);
					send(controller, { type: 'INIT', data: initial });
					const progress = await computeProgress(workspaceId, initial);
					send(controller, { type: 'PROJECT_PROGRESS', progressUpdates: progress });
				} catch (err) {
					sendError(controller, 'init', err);
				}
			})();

			ping = setInterval(() => {
				if (closed || controller.desiredSize === null) return;
				controller.enqueue(encoder.encode(`:ping\n\n`));
			}, 15000);

			poll = setInterval(async () => {
				if (closed) return;
				try {
					const updates = await listWorkspaceTasksWithAssignees(workspaceId);
					const maxVersion = updates.reduce((max, task) => Math.max(max, task.version), 0);
					if (maxVersion <= lastVersion) return;

					lastVersion = maxVersion;
					send(controller, { type: 'SYNC', data: updates });

					const progress = await computeProgress(workspaceId, updates);
					send(controller, { type: 'PROJECT_PROGRESS', progressUpdates: progress });
				} catch (err) {
					sendError(controller, 'sync', err);
				}
			}, 3000);
		},
		cancel() {
			closed = true;
			clearInterval(ping);
			clearInterval(poll);
		}
	});

	return new Response(stream);
};
