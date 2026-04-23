// src/lib/sse/TaskStore.ts
import { browser } from '$app/environment';
import type { Task } from '$lib/db/schema';

export type TaskRecord = Task & { assigneeIds?: string[] };

export class TaskStore {
  tasks = $state<TaskRecord[]>([]);
  connected = $state(false);
  error = $state<string | null>(null);
  private eventSource: EventSource | null = null;

  constructor(workspaceId: string) {
    if (browser) this.init(workspaceId);
  }

  private init(workspaceId: string) {
    this.eventSource = new EventSource(`/api/stream?workspace=${workspaceId}`);
    this.connected = true;
    this.error = null;

    this.eventSource.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === 'INIT' || type === 'SYNC') {
          this.tasks = [...data]; // Trigger Svelte 5 reactivity
        }
      } catch { /* ignore malformed */ }
    };

    this.eventSource.onerror = () => {
      this.connected = false;
      this.error = 'Connection lost. Reconnecting...';
      this.eventSource?.close();
      setTimeout(() => this.init(workspaceId), 3000);
    };
  }

  async updateStatus(id: string, newStatus: string) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const prevStatus = task.status;
    task.status = newStatus; // Optimistic UI
    this.error = null;

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to update task');
      }
    } catch (error) {
      task.status = prevStatus; // Rollback on failure
      this.error = error instanceof Error ? error.message : 'Failed to update task';
    }
  }

  async addTask(
    title: string,
    workspaceId: string,
    projectId: string | null = null,
    assigneeIds: string[] = []
  ) {
    const tempId = `temp-${Date.now()}`;
    const now = Date.now();
    this.error = null;
    this.tasks.push({
      id: tempId, title, workspaceId, projectId, status: 'todo', assigneeIds,
      version: 0, createdAt: now, updatedAt: now
    } as unknown as TaskRecord);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, workspaceId, projectId, assigneeIds })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to create task');
      }

      const saved = await res.json();
      // Replace temp with real
      const idx = this.tasks.findIndex(t => t.id === tempId);
      if (idx !== -1) this.tasks[idx] = saved;
    } catch (error) {
      this.tasks = this.tasks.filter(t => t.id !== tempId);
      this.error = error instanceof Error ? error.message : 'Failed to create task';
    }
  }

  destroy() {
    this.eventSource?.close();
    this.connected = false;
  }
}
