import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { tasks, taskAssignees, taskActivityLog } from '$lib/db/schema';
import { taskTitleSchema } from '$lib/validation';
import { eq, sql } from 'drizzle-orm';

async function listWorkspaceTasks(workspaceId: string) {
  const [taskRows, assigneeRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    db.select({
      taskId: taskAssignees.taskId,
      userId: taskAssignees.userId
    }).from(taskAssignees)
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

export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const workspaceId = url.searchParams.get('workspace');
  if (!workspaceId) return new Response('Missing workspace', { status: 400 });

  setHeaders({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  let lastVersion = 0;
  const encoder = new TextEncoder();
  let ping: ReturnType<typeof setInterval>;
  let poll: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      listWorkspaceTasks(workspaceId).then((initial) => {
        if (controller.desiredSize !== null) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'INIT', data: initial })}\n\n`));
        }
      }).catch(() => {});

      // Keep-alive ping
      ping = setInterval(() => {
        if (controller.desiredSize !== null) {
          controller.enqueue(encoder.encode(`:ping\n\n`));
        }
      }, 15000);

      // Poll for changes
      poll = setInterval(async () => {
        try {
          const updates = await listWorkspaceTasks(workspaceId);

          if (updates.length > 0 && updates[0].version > lastVersion) {
            lastVersion = updates[0].version;
            if (controller.desiredSize !== null) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'SYNC', data: updates })}\n\n`));
            }
          }
        } catch { /* ignore on disconnect */ }
      }, 3000);
    },
    cancel() {
      // Handle client disconnect - clear intervals
      clearInterval(ping);
      clearInterval(poll);
    }
  });

  return new Response(stream);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const { title, workspaceId, projectId, assigneeIds } = body;

  if (!title || !workspaceId) {
    return Response.json({ error: 'Missing title or workspaceId' }, { status: 400 });
  }

  const parsedTitle = taskTitleSchema.safeParse(title);
  if (!parsedTitle.success) {
    return Response.json({ error: parsedTitle.error.issues[0]?.message ?? 'Invalid task title' }, { status: 400 });
  }

  const ids: string[] = Array.isArray(assigneeIds)
    ? Array.from(new Set(assigneeIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))
    : [];

  const task = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(tasks)
      .values({ title: parsedTitle.data, workspaceId, projectId: projectId ?? null, status: 'todo', version: 1 })
      .returning();

    if (ids.length > 0) {
      await tx
        .insert(taskAssignees)
        .values(ids.map((userId) => ({ taskId: created.id, userId })));
    }

    await tx.insert(taskActivityLog).values({
      taskId: created.id,
      userId: locals.user?.id ?? null,
      action: 'created',
      oldValue: null,
      newValue: parsedTitle.data
    });

    if (ids.length > 0) {
      await tx.insert(taskActivityLog).values({
        taskId: created.id,
        userId: locals.user?.id ?? null,
        action: 'assignees_added',
        oldValue: null,
        newValue: ids.join(',')
      });
    }

    return created;
  });

  return Response.json({ ...task, assigneeIds: ids });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return Response.json({ error: 'Missing id or status' }, { status: 400 });
  }

  const actorId = locals.user.id;

  const task = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!existing) return null;

    const [updated] = await tx
      .update(tasks)
      .set({ status, version: sql`version + 1` })
      .where(eq(tasks.id, id))
      .returning();

    if (existing.status !== status) {
      await tx.insert(taskActivityLog).values({
        taskId: id,
        userId: actorId,
        action: 'status_changed',
        oldValue: existing.status,
        newValue: status
      });
    }

    return updated;
  });

  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  return Response.json(task);
};
