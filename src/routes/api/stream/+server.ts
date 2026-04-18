// src/routes/api/stream/+server.ts
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { tasks } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

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
      db.select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        projectId: tasks.projectId,
        title: tasks.title,
        status: tasks.status,
        version: tasks.version,
        updatedAt: tasks.updatedAt,
        assigneeId: tasks.assigneeId,
        createdAt: tasks.createdAt
      }).from(tasks).where(eq(tasks.workspaceId, workspaceId)).then((initial) => {
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

      // Poll for changes (serverless-safe alternative to DB webhooks)
      poll = setInterval(async () => {
        try {
          const updates = await db
            .select({
              id: tasks.id,
              workspaceId: tasks.workspaceId,
              projectId: tasks.projectId,
              title: tasks.title,
              status: tasks.status,
              version: tasks.version,
              updatedAt: tasks.updatedAt,
              assigneeId: tasks.assigneeId,
              createdAt: tasks.createdAt
            })
            .from(tasks)
            .where(eq(tasks.workspaceId, workspaceId))
            .orderBy(tasks.updatedAt);
          
          if (updates.length > 0 && updates[0].version > lastVersion) {
            lastVersion = updates[0].version;
            if (controller.desiredSize !== null) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'SYNC', data: updates })}\n\n`));
              
              // Calculate project progress
              const progressUpdates = updates.reduce((acc: Record<string, { total: number; done: number }>, t) => {
                if (!t.projectId) return acc;
                if (!acc[t.projectId]) acc[t.projectId] = { total: 0, done: 0 };
                acc[t.projectId].total++;
                if (t.status === 'done') acc[t.projectId].done++;
                return acc;
              }, {});
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'PROJECT_PROGRESS', progressUpdates })}\n\n`));
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


