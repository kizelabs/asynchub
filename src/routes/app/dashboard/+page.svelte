<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { TaskStore } from '$lib/sse/TaskStore.svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	const { data }: { data: PageData } = $props();

	const userName = $derived(data.user.name ?? data.user.email.split('@')[0]);

	let showNewWorkspaceDialog = $state(false);
	let newWorkspaceName = $state('');
	let creatingWorkspace = $state(false);

	let showNewProjectDialog = $state(false);
	let newProjectTitle = $state('');
	let newProjectDescription = $state('');
	let creatingProject = $state(false);

	// Live task stream for the selected workspace; used to recompute project progress.
	let store = $state<TaskStore | null>(null);
	$effect(() => {
		if (!data.workspace) return;
		const s = new TaskStore(data.workspace.id);
		store = s;
		return () => {
			s.destroy();
			store = null;
		};
	});

	// Build { [projectId]: { total, done } } from the live stream (falls back to server snapshot).
	const liveCounts = $derived.by(() => {
		const counts: Record<string, { total: number; done: number }> = {};
		const tasks = store?.tasks;
		if (!tasks || tasks.length === 0) return null;
		for (const t of tasks) {
			if (!t.projectId) continue;
			const entry = counts[t.projectId] ?? { total: 0, done: 0 };
			entry.total++;
			if (t.status === 'done') entry.done++;
			counts[t.projectId] = entry;
		}
		return counts;
	});

	const projectsWithLiveProgress = $derived(
		data.projects.map((p) => {
			const c = liveCounts?.[p.id];
			if (!c) return p;
			const progress = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
			return { ...p, progress, taskTotal: c.total, taskDone: c.done };
		})
	);

	function selectWorkspace(workspaceId: string) {
		goto(resolve(`/app/dashboard?workspace=${workspaceId}`), { replaceState: true });
	}

	const projectStatusOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'paused', label: 'Paused' },
		{ value: 'completed', label: 'Completed' }
	] as const;

	const projectStatusClasses: Record<string, string> = {
		active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
		paused: 'border-amber-200 bg-amber-50 text-amber-800',
		completed: 'border-blue-200 bg-blue-50 text-blue-700'
	};
</script>

<svelte:head>
	<title>Dashboard | AsyncHub</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
					<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<span class="font-semibold text-gray-900">AsyncHub</span>
			</div>
			<div class="flex items-center gap-3">
				<span class="hidden text-sm text-gray-600 sm:block">{userName}</span>
				<a
					href={resolve('/auth/sign-out')}
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
					aria-label="Sign out"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Sign out
				</a>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl space-y-6 px-4 py-6">
		<!-- Welcome Section -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight text-gray-900">
					Welcome back, {userName}
				</h1>
				<p class="mt-1 text-gray-600">Manage your workspaces and projects.</p>
			</div>
			<button
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
		</div>

		<!-- Workspace Selector -->
		{#if data.workspaces.length > 0}
			<div class="rounded-xl border border-gray-200 bg-white p-4">
				<h2 class="mb-3 text-sm font-medium text-gray-700">Select a workspace to get started</h2>
				<div class="flex flex-wrap gap-2">
					{#each data.workspaces as workspace (workspace.id)}
						<button
							onclick={() => selectWorkspace(workspace.id)}
							class="press-scale inline-flex items-center gap-2 rounded-lg border px-3 py-2 {data.workspace &&
							workspace.id === data.workspace.id
								? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-700 hover:shadow-lg active:bg-gray-950'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-700 hover:text-white hover:shadow-lg active:bg-gray-950'}"
						>
							<span class="text-sm font-medium">{workspace.name}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Quick Links (only show when workspace is selected) -->
		{#if data.workspace}
			<!-- Projects -->
			<section class="rounded-xl border border-gray-200 bg-white">
				<header class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
					<h2 class="text-sm font-semibold text-gray-900">
						Projects
						<span class="ml-1 text-xs font-normal text-gray-500">({data.projects.length})</span>
					</h2>
					<div class="flex items-center gap-2">
						{#if data.viewerRole === 'owner'}
							<a
								href={resolve(`/app/dashboard/members?workspace=${data.workspace.id}`)}
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
					</div>
				</header>
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
										href={resolve(`/app/dashboard/tasks?workspace=${data.workspace.id}&project=${project.id}`)}
										class="min-w-0 flex-1 transition hover:text-gray-950"
									>
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
											<span class="text-xs tabular-nums text-gray-500">
												{project.progress ?? 0}% · {project.taskDone ?? 0}/{project.taskTotal ?? 0}
											</span>
										</div>
									</a>
									<div class="ml-4 flex shrink-0 items-center gap-3">
										<span
											class={`rounded-full border px-2 py-0.5 text-xs ${projectStatusClasses[project.status] ?? 'border-gray-200 bg-gray-50 text-gray-700'}`}
											>{project.status}</span
										>
										<form
											method="POST"
											action="?/updateProjectStatus"
											use:enhance={() => async ({ update }) => {
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
												{#each projectStatusOptions as option (option.value)}
													<option value={option.value}>{option.label}</option>
												{/each}
											</select>
										</form>
										<svg
											class="h-4 w-4 text-gray-400"
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
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</main>
</div>

<!-- New Workspace Dialog -->
{#if showNewWorkspaceDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 cursor-default bg-black/50"
			onclick={() => (showNewWorkspaceDialog = false)}
			aria-label="Close dialog"
			transition:fade={{ duration: 150 }}
		></button>
		<div
			class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
			transition:scale={{ duration: 180, start: 0.96, easing: cubicOut }}
		>
			<h2 class="mb-1 text-xl font-semibold text-gray-900">Create new workspace</h2>
			<p class="mb-6 text-sm text-gray-500">
				Where your team will collaborate. You can rename this later.
			</p>

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
						URL preview: <span class="font-mono text-gray-700"
							>asynchub.app/w/{newWorkspaceName
								? newWorkspaceName.toLowerCase().replace(/\s+/g, '-')
								: 'workspace'}</span
						>
					</p>
				</div>

				<div class="mt-6 flex gap-3">
					<button
						type="button"
						onclick={() => (showNewWorkspaceDialog = false)}
						class="flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={creatingWorkspace || newWorkspaceName.length < 2}
						class="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
					>
						{creatingWorkspace ? 'Creating...' : 'Create workspace'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- New Project Dialog -->
{#if showNewProjectDialog && data.workspace}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 cursor-default bg-black/50"
			onclick={() => (showNewProjectDialog = false)}
			aria-label="Close dialog"
			transition:fade={{ duration: 150 }}
		></button>
		<div
			class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
			transition:scale={{ duration: 180, start: 0.96, easing: cubicOut }}
		>
			<h2 class="mb-1 text-xl font-semibold text-gray-900">Create new project</h2>
			<p class="mb-6 text-sm text-gray-500">
				In workspace <span class="font-medium text-gray-700">{data.workspace.name}</span>.
			</p>

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
						<label for="projectDescription" class="mb-1 block text-sm font-medium text-gray-700"
							>Description <span class="text-gray-400">(optional)</span></label
						>
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
						class="flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={creatingProject || newProjectTitle.length < 3}
						class="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
					>
						{creatingProject ? 'Creating...' : 'Create project'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
