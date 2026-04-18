<script lang="ts">
  import type { PageData } from '../$types';
  import { enhance } from '$app/forms';
  let { data }: { data: PageData & { projects: any[] } } = $props();

  let title = $state('');
  let description = $state('');
  let type = $state<'project' | 'task'>('project');
  let selectedProjectId = $state<string>('');

  const canSubmit = $derived(title.trim().length >= 3 && (type !== 'task' || !!selectedProjectId));
</script>

<svelte:head><title>Create | {data.workspace.name}</title></svelte:head>

<div class="max-w-2xl mx-auto space-y-6 p-4">
  <div class="flex items-center gap-4 text-sm text-gray-600">
    <a href="/app/dashboard" class="hover:underline">Dashboard</a>
    <span>/</span>
    <span class="font-medium text-gray-900">Create {type === 'project' ? 'Project' : 'Task'}</span>
  </div>

  <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <div class="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
      <button 
        onclick={() => type = 'project'}
        class={`px-4 py-1.5 text-sm font-medium rounded-md transition ${type === 'project' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
        Project
      </button>
      <button 
        onclick={() => type = 'task'}
        class={`px-4 py-1.5 text-sm font-medium rounded-md transition ${type === 'task' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
        Task
      </button>
    </div>

    <form method="POST" use:enhance class="space-y-5">
      <input type="hidden" name="type" value={type} />
      {#if type === 'task' && selectedProjectId}
        <input type="hidden" name="projectId" value={selectedProjectId} />
      {/if}
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
        <input 
          id="title"
          name="title"
          bind:value={title} 
          placeholder={type === 'project' ? "e.g. Q4 Marketing Launch" : "e.g. Update homepage copy"} 
          class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:outline-none"
          required
        />
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea 
          id="description"
          name="description"
          bind:value={description} 
          placeholder="Add details, context, or acceptance criteria..." 
          rows="4"
          class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:outline-none resize-none"
        ></textarea>
      </div>

      {#if type === 'task'}
        <div>
          <label for="projectId" class="block text-sm font-medium text-gray-700 mb-1.5">Assign to Project</label>
          <select id="projectId" bind:value={selectedProjectId} class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:outline-none bg-white">
            <option value="">Select a project...</option>
            {#each data.projects as p (p.id)}
              <option value={p.id}>{p.title}</option>
            {/each}
          </select>
        </div>
      {/if}

      <div class="flex justify-end gap-3 pt-2">
        <a href="/app/dashboard" class="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition">Cancel</a>
        <button 
          type="submit" 
          disabled={!canSubmit}
          class="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition">
          Create {type === 'project' ? 'Project' : 'Task'}
        </button>
      </div>
    </form>
  </div>
</div>
