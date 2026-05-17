<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/dashboard/AppShell.svelte';
	import PageHeader from '$lib/components/dashboard/PageHeader.svelte';

	let { data }: { data: PageData } = $props();

	const workspaceId = $derived(data.workspace?.id ?? '');
	const workspaceName = $derived(data.workspace?.name ?? 'Workspace');
	const userName = $derived(data.user.name ?? data.user.email.split('@')[0]);

	let title = $state('');
	let description = $state('');
	let type = $state<'project' | 'task'>('project');
	let selectedProjectId = $state<string>('');

	const canSubmit = $derived(title.trim().length >= 3 && (type !== 'task' || !!selectedProjectId));
</script>

<svelte:head>
	<title>Create | {workspaceName}</title>
</svelte:head>

<AppShell
	{userName}
	backHref={`/app/dashboard?workspace=${workspaceId}`}
	backLabel="Back to dashboard"
>
	{#snippet children()}
		<PageHeader
			title={`Create ${type === 'project' ? 'Project' : 'Task'}`}
			description={`Add a new ${type} in ${workspaceName}.`}
			breadcrumbs={[
				{ label: workspaceName, href: `/app/dashboard?workspace=${workspaceId}` },
				{ label: `Create ${type === 'project' ? 'Project' : 'Task'}` }
			]}
		/>

		<div class="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-6 flex w-fit gap-2 rounded-lg bg-gray-100 p-1">
				<button
					type="button"
					onclick={() => (type = 'project')}
					class={`rounded-md px-4 py-1.5 text-sm font-medium transition ${type === 'project' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
				>
					Project
				</button>
				<button
					type="button"
					onclick={() => (type = 'task')}
					class={`rounded-md px-4 py-1.5 text-sm font-medium transition ${type === 'task' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
				>
					Task
				</button>
			</div>

			<form method="POST" use:enhance class="space-y-5">
				<input type="hidden" name="workspaceId" value={workspaceId} />
				<input type="hidden" name="type" value={type} />
				{#if type === 'task' && selectedProjectId}
					<input type="hidden" name="projectId" value={selectedProjectId} />
				{/if}

				<div>
					<label for="title" class="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
					<input
						id="title"
						name="title"
						bind:value={title}
						placeholder={type === 'project'
							? 'e.g. Q4 Marketing Launch'
							: 'e.g. Update homepage copy'}
						class="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-gray-900 focus:outline-none"
						required
					/>
				</div>

				<div>
					<label for="description" class="mb-1.5 block text-sm font-medium text-gray-700"
						>Description</label
					>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						placeholder="Add details, context, or acceptance criteria..."
						rows="4"
						class="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-gray-900 focus:outline-none"
					></textarea>
				</div>

				{#if type === 'task'}
					<div>
						<label for="projectId" class="mb-1.5 block text-sm font-medium text-gray-700"
							>Assign to Project</label
						>
						<select
							id="projectId"
							bind:value={selectedProjectId}
							class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 focus:ring-2 focus:ring-gray-900 focus:outline-none"
						>
							<option value="">Select a project...</option>
							{#each data.projects as project (project.id)}
								<option value={project.id}>{project.title}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="flex justify-end gap-3 pt-2">
					<a
						href={`/app/dashboard?workspace=${workspaceId}`}
						class="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
					>
						Cancel
					</a>
					<button
						type="submit"
						disabled={!canSubmit}
						class="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Create {type === 'project' ? 'Project' : 'Task'}
					</button>
				</div>
			</form>
		</div>
	{/snippet}
</AppShell>
