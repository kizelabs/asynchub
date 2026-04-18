<script lang="ts">
  import type { PageData } from '../$types';
  import { TaskStore } from '$lib/sse/TaskStore';
  import type { PageData } from './$types';
  export let data: PageData;

  let newTask = $state('');
  const store = new TaskStore(data.workspace.id);

  $effect(() => () => store.destroy()); // Cleanup on unmount

  const statusColors = $derived({
    todo: 'bg-gray-100 text-gray-700 border-gray-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    done: 'bg-green-50 text-green-700 border-green-200'
  });

  const addTask = async () => {
    if (!newTask.trim()) return;
    await store.addTask(newTask.trim(), data.workspace.id);
    newTask = '';
  };
</script>

<svelte:head><title>Tasks | {data.workspace.name}</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold tracking-tight">Tasks</h1>
    {#if store.error}
      <div class="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 animate-pulse">
        {store.error}
      </div>
    {/if}
    {#if !store.connected}
      <span class="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">Reconnecting...</span>
    {/if}
  </div>

  <form onsubmit|preventDefault={addTask} class="flex gap-3">
    <input 
      bind:value={newTask} 
      placeholder="Add a task..." 
      class="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:outline-none"
    />
    <button type="submit" disabled={!newTask.trim() || !store.connected} 
            class="px-5 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition">
      Add
    </button>
  </form>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each ['todo', 'in_progress', 'done'] as status}
      <div class="bg-white rounded-xl border border-gray-200 p-4 min-h-[300px]">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {store.tasks.filter(t => t.status === status).length}
          </span>
        </div>

        <div class="space-y-3">
          {#each store.tasks.filter(t => t.status === status) as task}
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition cursor-pointer group">
              <p class="text-sm text-gray-800">{task.title}</p>
              <div class="mt-2 flex gap-2">
                {#each ['todo', 'in_progress', 'done'] as opt}
                  <button 
                    on:click={() => store.updateStatus(task.id, opt)}
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
