<script lang="ts">
  import type { PageData } from './$types';
  const { data }: { data: PageData } = $props();

  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    archived: 'bg-gray-100 text-gray-700 border-gray-200'
  };
</script>

<svelte:head><title>Projects | {data.workspace.name}</title></svelte:head>

<div class="space-y-6 p-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/app/dashboard" class="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-900">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </a>
      <h1 class="text-2xl font-semibold tracking-tight">Active Projects</h1>
    </div>
    <a href="/app/dashboard/create" class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition">
      New Project
    </a>
  </div>

  {#if data.projects.length === 0}
    <div class="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
      <p class="text-gray-500">No projects yet. Create your first one to get started.</p>
      <a href="/app/dashboard/create" class="mt-4 inline-flex text-sm font-medium text-blue-600 hover:underline">Create Project →</a>
    </div>
  {/if}

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each data.projects as project (project)}
      <div class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition group">
        <div class="flex items-start justify-between mb-3">
          <span class={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[project.status as keyof typeof statusColors]}`}>
            {project.status}
          </span>
          <span class="text-xs text-gray-400">{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
        <h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition">{project.title}</h3>
        {#if project.description}
          <p class="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
        {/if}
        <div class="mt-4">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div class="bg-blue-600 h-full rounded-full transition-all duration-500" style="width: {project.progress}%"></div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
