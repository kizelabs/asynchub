<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import AppShell from '$lib/components/dashboard/AppShell.svelte';
	import ModalPanel from '$lib/components/dashboard/ModalPanel.svelte';
	import PageHeader from '$lib/components/dashboard/PageHeader.svelte';
	import SectionCard from '$lib/components/dashboard/SectionCard.svelte';
	import WorkspaceSwitcher from '$lib/components/dashboard/WorkspaceSwitcher.svelte';
	import { PROJECT_STATUS_CLASSES, PROJECT_STATUS_OPTIONS } from '$lib/presentation/projects';
	import { TaskStore } from '$lib/sse/TaskStore.svelte';

	const { data }: { data: PageData } = $props();

	const userName = $derived(data.user.name ?? data.user.email.split('@')[0]);

	let switchingWorkspaceId = $state<string | null>(null);
	let showNewWorkspaceDialog = $state(false);
	let newWorkspaceName = $state('');
	let creatingWorkspace = $state(false);
	let showNewProjectDialog = $state(false);
	let newProjectTitle = $state('');
	let newProjectDescription = $state('');
	let creatingProject = $state(false);
	let store = $state<TaskStore | null>(null);

	async function selectWorkspace(event: MouseEvent, workspaceId: string) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		event.preventDefault();
		if (data.workspace?.id === workspaceId) return;

		switchingWorkspaceId = workspaceId;
		try {
			await goto(`/app/dashboard?workspace=${workspaceId}`, {
				keepFocus: true,
				noScroll: true,
				replaceState: true
			});
		} finally {
			switchingWorkspaceId = null;
		}
	}

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
			return {
				...project,
				progress,
				taskTotal: counts.total,
				taskDone: counts.done
			};
		});
	});
</script>

<svelte:head>
	<title>Dashboard | AsyncHub</title>
</svelte:head>

<AppShell {userName}>
	{#snippet children()}
		<PageHeader
			title={`Welcome back, ${userName}`}
			description="Manage your workspaces and projects."
		>
			{#snippet actions()}
				<button
					type="button"
					onclick={() => (showNewWorkspaceDialog = true)}
					class="press-scale inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 hover:shadow-lg active:bg-gray-950"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					New Workspace
				</button>
			{/snippet}
		</PageHeader>

		<WorkspaceSwitcher
			workspaces={data.workspaces}
			activeWorkspaceId={data.workspace?.id}
			pendingWorkspaceId={switchingWorkspaceId}
			onselect={selectWorkspace}
		/>

		{#if data.workspace}
			<SectionCard title="Projects" count={data.projects.length}>
				{#snippet actions()}
					{#if data.viewerRole === 'owner'}
						<a
							href={`/app/dashboard/members?workspace=${data.workspace.id}`}
							class="press-scale inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Members ({data.memberCount})
						</a>
					{:else}
						<span
							class="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-500"
						>
							Members ({data.memberCount})
						</span>
					{/if}
					<button
						type="button"
						onclick={() => (showNewProjectDialog = true)}
						class="press-scale inline-flex items-center rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
					>
						New project
					</button>
				{/snippet}

				{#if projectsWithLiveProgress.length === 0}
					<p class="px-5 py-6 text-sm text-gray-500">
						No projects yet. Create one to start tracking work.
					</p>
				{:else}
					<ul class="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-2">
						{#each projectsWithLiveProgress as project (project.id)}
							<li class="bg-white">
								<div class="flex h-full items-center justify-between px-5 py-3">
									<a
										href={`/app/dashboard/tasks?workspace=${data.workspace.id}&project=${project.id}`}
										class="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg transition hover:bg-gray-50 hover:text-gray-950"
									>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium text-gray-900">{project.title}</p>
											{#if project.description}
												<p class="mt-0.5 truncate text-xs text-gray-500">{project.description}</p>
											{/if}
											<div class="mt-2 flex items-center gap-2">
												<div class="h-1.5 max-w-[200px] flex-1 rounded-full bg-gray-100">
													<div
														class="h-1.5 rounded-full bg-gray-900 transition-all"
														style={`width: ${project.progress ?? 0}%`}
													></div>
												</div>
												<span class="text-xs text-gray-500 tabular-nums">
													{project.progress ?? 0}% · {project.taskDone ?? 0}/{project.taskTotal ??
														0}
												</span>
											</div>
										</div>
										<svg
											class="h-4 w-4 shrink-0 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</a>
									<div class="ml-4 flex shrink-0 items-center gap-3">
										<span
											class={`rounded-full border px-2 py-0.5 text-xs ${PROJECT_STATUS_CLASSES[project.status] ?? 'border-gray-200 bg-gray-50 text-gray-700'}`}
										>
											{project.status}
										</span>
										<form
											method="POST"
											action="?/updateProjectStatus"
											use:enhance={() =>
												async ({ update }) => {
													await update();
												}}
										>
											<input type="hidden" name="workspaceId" value={data.workspace.id} />
											<input type="hidden" name="projectId" value={project.id} />
											<label class="sr-only" for={`status-${project.id}`}>Project status</label>
											<select
												id={`status-${project.id}`}
												name="status"
												value={project.status}
												onchange={(event) => {
													(event.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
												}}
												class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
											>
												{#each PROJECT_STATUS_OPTIONS as option (option.value)}
													<option value={option.value}>{option.label}</option>
												{/each}
											</select>
										</form>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</SectionCard>
		{/if}
	{/snippet}
</AppShell>

<ModalPanel
	open={showNewWorkspaceDialog}
	title="Create new workspace"
	description="Where your team will collaborate. You can rename this later."
	onclose={() => (showNewWorkspaceDialog = false)}
>
	<form
		method="POST"
		action="?/createWorkspace"
		use:enhance={() => {
			creatingWorkspace = true;
			return async ({ result, update }) => {
				creatingWorkspace = false;
				if (result.type === 'failure') {
					await update();
				} else if (result.type === 'redirect') {
					showNewWorkspaceDialog = false;
					await update();
				}
			};
		}}
	>
		<div class="space-y-4">
			<div>
				<label for="workspaceName" class="mb-1 block text-sm font-medium text-gray-700"
					>Workspace name</label
				>
				<input
					type="text"
					id="workspaceName"
					name="workspaceName"
					bind:value={newWorkspaceName}
					placeholder="e.g. Design Team"
					required
					minlength="2"
					class="w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
			<p class="text-xs text-gray-500">
				URL preview:
				<span class="font-mono text-gray-700">
					asynchub.app/w/{newWorkspaceName
						? newWorkspaceName.toLowerCase().replace(/\s+/g, '-')
						: 'workspace'}
				</span>
			</p>
		</div>

		<div class="mt-6 flex gap-3">
			<button
				type="button"
				onclick={() => (showNewWorkspaceDialog = false)}
				class="press-scale flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={creatingWorkspace || newWorkspaceName.length < 2}
				class="press-scale inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
			>
				{#if creatingWorkspace}
					<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"
						></circle>
						<path
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							class="opacity-75"
						></path>
					</svg>
					Creating...
				{:else}
					Create workspace
				{/if}
			</button>
		</div>
	</form>
</ModalPanel>

{#if data.workspace}
	<ModalPanel
		open={showNewProjectDialog}
		title="Create new project"
		description={`In workspace ${data.workspace.name}.`}
		onclose={() => (showNewProjectDialog = false)}
	>
		<form
			method="POST"
			action="?/createProject"
			use:enhance={() => {
				creatingProject = true;
				return async ({ result, update }) => {
					creatingProject = false;
					if (result.type === 'failure') {
						await update();
					} else if (result.type === 'redirect') {
						showNewProjectDialog = false;
						newProjectTitle = '';
						newProjectDescription = '';
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="workspaceId" value={data.workspace.id} />
			<div class="space-y-4">
				<div>
					<label for="projectTitle" class="mb-1 block text-sm font-medium text-gray-700"
						>Project title</label
					>
					<input
						type="text"
						id="projectTitle"
						name="title"
						bind:value={newProjectTitle}
						placeholder="e.g. Q2 Launch"
						required
						minlength="3"
						class="w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
				<div>
					<label for="projectDescription" class="mb-1 block text-sm font-medium text-gray-700">
						Description <span class="text-gray-400">(optional)</span>
					</label>
					<textarea
						id="projectDescription"
						name="description"
						bind:value={newProjectDescription}
						rows="3"
						placeholder="What is this project about?"
						class="w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					></textarea>
				</div>
			</div>

			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={() => (showNewProjectDialog = false)}
					class="press-scale flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={creatingProject || newProjectTitle.length < 3}
					class="press-scale inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
				>
					{#if creatingProject}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								class="opacity-25"
							></circle>
							<path
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								class="opacity-75"
							></path>
						</svg>
						Creating...
					{:else}
						Create project
					{/if}
				</button>
			</div>
		</form>
	</ModalPanel>
{/if}
