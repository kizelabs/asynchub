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

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state
      const initial = await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'INIT', data: initial })}\n\n`));

      // Keep-alive ping
      const ping = setInterval(() => controller.enqueue(encoder.encode(`:ping\n\n`)), 15000);

      // Poll for changes (serverless-safe alternative to DB webhooks)
      const poll = setInterval(async () => {
        try {
          const updates = await db
            .select()
            .from(tasks)
            .where(eq(tasks.workspaceId, workspaceId))
            .orderBy(tasks.updatedAt);
          
          if (updates.length > 0 && updates[0].version > lastVersion) {
            lastVersion = updates[0].version;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'SYNC', data: updates })}\n\n`));
          }
        } catch (e) { /* ignore on disconnect */ }
      }, 3000);

      // Cleanup on client disconnect
      return () => {
        clearInterval(ping);
        clearInterval(poll);
      };
    }
  });

  return new Response(stream);
};
