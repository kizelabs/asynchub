<script lang="ts">
  import type { PageData } from './$types';
  const { data }: { data: PageData } = $props();

  const roleColors = {
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    admin: 'bg-blue-100 text-blue-800 border-blue-200',
    member: 'bg-gray-100 text-gray-800 border-gray-200'
  };
</script>

<svelte:head><title>Members | {data.workspace.name}</title></svelte:head>

<div class="space-y-6 p-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/app/dashboard" class="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-900">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </a>
      <h1 class="text-2xl font-semibold tracking-tight">Team Members</h1>
    </div>
    <button class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      Invite Member
    </button>
  </div>

  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <table class="w-full text-left text-sm">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-6 py-3 font-medium text-gray-600">Name</th>
          <th class="px-6 py-3 font-medium text-gray-600">Email</th>
          <th class="px-6 py-3 font-medium text-gray-600">Role</th>
          <th class="px-6 py-3 font-medium text-gray-600">Joined</th>
          <th class="px-6 py-3 font-medium text-gray-600 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        {#each data.members as member (member)}
          <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
              </div>
              {member.name || 'Unnamed'}
            </td>
            <td class="px-6 py-4 text-gray-600">{member.email}</td>
            <td class="px-6 py-4">
              <span class={`px-2 py-0.5 text-xs font-medium rounded-full border ${roleColors[member.role as keyof typeof roleColors]}`}>
                {member.role}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-500">{new Date(member.joinedAt).toLocaleDateString()}</td>
            <td class="px-6 py-4 text-right">
              <button class="text-gray-400 hover:text-gray-700 transition">•••</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
