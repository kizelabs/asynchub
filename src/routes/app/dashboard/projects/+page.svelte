<script lang="ts">
	import type { PageData } from './$types';
	import AppShell from '$lib/components/dashboard/AppShell.svelte';
	import PageHeader from '$lib/components/dashboard/PageHeader.svelte';
	import { formatShortDate } from '$lib/presentation/formatters';
	import { TaskStore } from '$lib/sse/TaskStore.svelte';

	const { data }: { data: PageData } = $props();

	const workspaceId = $derived(data.workspace?.id ?? '');
	const workspaceName = $derived(data.workspace?.name ?? 'Workspace');
	const userName = $derived(data.user.name ?? data.user.email.split('@')[0]);

	let store = $state<TaskStore | null>(null);

	$effect(() => {
		if (!data.workspace) return;
		const taskStore = new TaskStore(data.workspace.id);
		store = taskStore;
		return () => {
			taskStore.destroy();
			store = null;
		};
	});

	const projectsWithLiveProgress = $derived.by(() => {
		const progressMap = store?.projectProgress ?? {};
		return data.projects.map((project) => {
			const counts = progressMap[project.id];
			if (!counts) return project;
			const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
			return { ...project, progress, taskTotal: counts.total, taskDone: counts.done };
		});
	});

	const statusColors = {
		active: 'bg-green-100 text-green-800 border-green-200',
		paused: 'bg-amber-100 text-amber-800 border-amber-200',
		completed: 'bg-gray-100 text-gray-700 border-gray-200'
	};
</script>

<svelte:head>
	<title>Projects | {workspaceName}</title>
</svelte:head>

<AppShell
	{userName}
	backHref={`/app/dashboard?workspace=${workspaceId}`}
	backLabel="Back to dashboard"
>
	{#snippet children()}
		<PageHeader
			title="Projects"
			description={`Browse projects in ${workspaceName}.`}
			breadcrumbs={[
				{ label: workspaceName, href: `/app/dashboard?workspace=${workspaceId}` },
				{ label: 'Projects' }
			]}
		>
			{#snippet actions()}
				<a
					href={`/app/dashboard/create?workspace=${workspaceId}`}
					class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
				>
					New Project
				</a>
			{/snippet}
		</PageHeader>

		{#if data.projects.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
				<p class="text-gray-500">No projects yet. Create your first one to get started.</p>
				<a
					href={`/app/dashboard/create?workspace=${workspaceId}`}
					class="mt-4 inline-flex text-sm font-medium text-blue-600 hover:underline"
				>
					Create Project →
				</a>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each projectsWithLiveProgress as project (project.id)}
					<div
						class="group rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
					>
						<div class="mb-3 flex items-start justify-between">
							<span
								class={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[project.status as keyof typeof statusColors] ?? statusColors.active}`}
							>
								{project.status}
							</span>
							<span class="text-xs text-gray-400">{formatShortDate(project.createdAt)}</span>
						</div>
						<h3 class="font-medium text-gray-900 transition group-hover:text-blue-600">
							{project.title}
						</h3>
						{#if project.description}
							<p class="mt-1 line-clamp-2 text-sm text-gray-500">{project.description}</p>
						{/if}
						<div class="mt-4">
							<div class="mb-1 flex justify-between text-xs text-gray-500">
								<span>Progress</span>
								<span>{project.progress ?? 0}%</span>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
								<div
									class="h-full rounded-full bg-blue-600 transition-all duration-500"
									style={`width: ${project.progress ?? 0}%`}
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/snippet}
</AppShell>
