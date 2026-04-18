<script lang="ts">
  import type { PageData } from './$types';
  import { TaskStore } from '$lib/sse/TaskStore.svelte';

  const { data }: { data: PageData } = $props();

  const workspaceId = $derived(data.workspace.id);
  const workspaceName = $derived(data.workspace.name);

  let newTask = $state('');
  let store = $state<TaskStore | null>(null);

  $effect(() => {
    const s = new TaskStore(workspaceId);
    store = s;
    return () => s.destroy();
  });

  const addTask = async (e: Event) => {
    e.preventDefault();
    if (!newTask.trim() || !store) return;
    await store.addTask(newTask.trim(), workspaceId);
    newTask = '';
  };
</script>

<svelte:head><title>Tasks | {workspaceName}</title></svelte:head>

<div class="space-y-6 p-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/app/dashboard" aria-label="Back to dashboard" class="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-900">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </a>
      <h1 class="text-2xl font-semibold tracking-tight">Tasks</h1>
    </div>
    {#if store?.error}
      <div class="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 animate-pulse">
        {store.error}
      </div>
    {/if}
    {#if store && !store.connected}
      <span class="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">Reconnecting...</span>
    {/if}
  </div>

  <form onsubmit={addTask} class="flex gap-3">
    <input 
      bind:value={newTask} 
      placeholder="Add a task..." 
      class="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:outline-none"
    />
    <button type="submit" disabled={!newTask.trim() || !store?.connected} 
            class="px-5 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition">
      Add
    </button>
  </form>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each ['todo', 'in_progress', 'done'] as status (status)}
      <div class="bg-white rounded-xl border border-gray-200 p-4 min-h-[300px]">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {store?.tasks.filter((t: { status: string }) => t.status === status).length ?? 0}
          </span>
        </div>

        <div class="space-y-3">
          {#each (store?.tasks ?? []).filter((t: { status: string }) => t.status === status) as task (task.id)}
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition cursor-pointer group">
              <p class="text-sm text-gray-800">{task.title}</p>
              <div class="mt-2 flex gap-2">
                {#each ['todo', 'in_progress', 'done'] as opt (opt)}
                  <button 
                    onclick={() => store?.updateStatus(task.id, opt)}
                    disabled={task.status === opt}
                    class="text-xs px-2 py-1 rounded-md border transition {opt === task.status ? 'ring-2 ring-gray-900 font-medium' : 'opacity-50 hover:opacity-100'}">
                    {opt.replace('_', ' ')}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
