// src/lib/sse/TaskStore.ts
import { browser } from '$app/environment';
import { invalidate } from '$app/navigation';
import type { Task } from '$lib/db/schema';

export type TaskRecord = Task & { assigneeIds?: string[] };

export type ProjectProgress = Record<string, { total: number; done: number }>;

export class TaskStore {
  tasks = $state<TaskRecord[]>([]);
  connected = $state(false);
  error = $state<string | null>(null);
  pendingTaskIds = $state<string[]>([]);
  projectProgress = $state<ProjectProgress>({});
  private eventSource: EventSource | null = null;

  constructor(workspaceId: string, initialTasks: TaskRecord[] = []) {
    this.tasks = [...initialTasks];
    if (browser) this.init(workspaceId);
  }

  private init(workspaceId: string) {
    this.eventSource = new EventSource(`/api/stream?workspace=${workspaceId}`);
    this.connected = true;
    this.error = null;

    this.eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        switch (payload.type) {
          case 'INIT':
          case 'SYNC':
            this.tasks = [...payload.data];
            break;
          case 'PROJECT_PROGRESS':
            this.projectProgress = { ...payload.progressUpdates };
            break;
          case 'ERROR':
            this.error = payload.message ?? 'Stream error';
            break;
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
    if (this.pendingTaskIds.includes(id)) return;

    const prevStatus = task.status;
    this.pendingTaskIds = [...this.pendingTaskIds, id];
    this.tasks = this.tasks.map((t) =>
      t.id === id ? { ...t, status: newStatus } : t
    );
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

      const saved = await res.json().catch(() => null);
      if (saved) {
        this.tasks = this.tasks.map((t) =>
          t.id === id ? { ...t, ...saved } : t
        );
      }
      void invalidate('app:tasks');
    } catch (error) {
      this.tasks = this.tasks.map((t) =>
        t.id === id ? { ...t, status: prevStatus } : t
      );
      this.error = error instanceof Error ? error.message : 'Failed to update task';
    } finally {
      this.pendingTaskIds = this.pendingTaskIds.filter((taskId) => taskId !== id);
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
      void invalidate('app:tasks');
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
