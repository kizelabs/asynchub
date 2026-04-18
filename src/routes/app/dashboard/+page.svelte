<script lang="ts">
  import type { PageData } from '../../app/dashboard/$types';

  const { data }: { data: PageData } = $props();

  const userName = $derived(data.user.name ?? data.user.email.split('@')[0]);
</script>

<svelte:head>
  <title>Dashboard | AsyncHub</title>
</svelte:head>

<div class="space-y-6 p-4">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
        Welcome back, {userName}
      </h1>
      <p class="mt-1 text-gray-600">Your workspace <span class="font-medium">{data.workspace.name}</span> is active.</p>
    </div>
    <button class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      New Project
    </button>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/app/dashboard/projects" class="group block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition">
      <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
      </div>
      <h3 class="font-medium text-gray-900">Active Projects</h3>
      <p class="text-sm text-gray-500 mt-1">Track milestones and deliverables.</p>
    </a>

    <a href="/app/dashboard/tasks" class="group block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition">
      <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3 group-hover:bg-green-100 transition">
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
      </div>
      <h3 class="font-medium text-gray-900">My Tasks</h3>
      <p class="text-sm text-gray-500 mt-1">View assigned work and deadlines.</p>
    </a>

    <a href="/app/dashboard/members" class="group block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition">
      <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition">
        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
      </div>
      <h3 class="font-medium text-gray-900">Team Members</h3>
      <p class="text-sm text-gray-500 mt-1">Manage roles and invite links.</p>
    </a>
  </div>
</div>
