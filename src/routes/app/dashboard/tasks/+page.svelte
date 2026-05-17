<script lang="ts">
	import type { PageData } from './$types';
	import AppShell from '$lib/components/dashboard/AppShell.svelte';
	import Avatar from '$lib/components/dashboard/Avatar.svelte';
	import PageHeader from '$lib/components/dashboard/PageHeader.svelte';
	import TaskActivityDrawer from '$lib/components/dashboard/TaskActivityDrawer.svelte';
	import { TASK_STATUS_OPTIONS, type TaskActivityEntry } from '$lib/presentation/tasks';
	import { TaskStore, type TaskRecord } from '$lib/sse/TaskStore.svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';

	const { data }: { data: PageData } = $props();

	const workspaceId = $derived(data.workspace!.id);
	const workspaceName = $derived(data.workspace!.name);
	const project = $derived(data.project);
	const userName = $derived(data.user.name ?? data.user.email.split('@')[0]);

	let newTask = $state('');
	let selectedAssignees = $state<string[]>([]);
	let store = $state<TaskStore | null>(null);
	let activityTaskId = $state<string | null>(null);
	let activityEntries = $state<TaskActivityEntry[]>([]);
	let activityLoading = $state(false);
	let activityError = $state<string | null>(null);

	const activityTask = $derived(
		activityTaskId ? (store?.tasks.find((task) => task.id === activityTaskId) ?? null) : null
	);

	const memberMap = $derived.by(() =>
		Object.fromEntries(data.members.map((member) => [member.id, member]))
	);
	const projectMap = $derived.by(() =>
		Object.fromEntries(data.projects.map((projectRow) => [projectRow.id, projectRow]))
	);

	$effect(() => {
		const taskStore = new TaskStore(workspaceId, data.initialTasks);
		store = taskStore;
		return () => taskStore.destroy();
	});

	const visibleTasks = $derived(
		(store?.tasks ?? (data.initialTasks as TaskRecord[])).filter((task) =>
			project ? task.projectId === project.id : true
		)
	);

	async function openActivity(taskId: string) {
		activityTaskId = taskId;
		activityEntries = [];
		activityError = null;
		activityLoading = true;
		try {
			const response = await fetch(`/api/tasks/${taskId}/activity`);
			if (!response.ok) throw new Error('Failed to load activity');
			const payload = await response.json();
			activityEntries = payload.activity ?? [];
		} catch (error) {
			activityError = error instanceof Error ? error.message : 'Failed to load activity';
		} finally {
			activityLoading = false;
		}
	}

	function closeActivity() {
		activityTaskId = null;
		activityEntries = [];
		activityError = null;
	}

	function assigneesForTask(task: TaskRecord) {
		return (task.assigneeIds ?? [])
			.map((assigneeId) => memberMap[assigneeId])
			.filter((member) => Boolean(member));
	}

	function toggleAssignee(id: string) {
		selectedAssignees = selectedAssignees.includes(id)
			? selectedAssignees.filter((value) => value !== id)
			: [...selectedAssignees, id];
	}

	async function addTask(event: Event) {
		event.preventDefault();
		if (!newTask.trim() || !store) return;

		await store.addTask(newTask.trim(), workspaceId, project?.id ?? null, selectedAssignees);
		newTask = '';
		selectedAssignees = [];
	}
</script>

<svelte:head>
	<title>{project ? project.title : 'Tasks'} | {workspaceName}</title>
</svelte:head>

<AppShell
	{userName}
	backHref={`/app/dashboard?workspace=${workspaceId}`}
	backLabel="Back to dashboard"
>
	{#snippet status()}
		{#if store?.error}
			<span
				class="animate-pulse rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700"
			>
				{store.error}
			</span>
		{:else if store && !store.connected}
			<span
				class="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700"
			>
				Reconnecting...
			</span>
		{/if}
	{/snippet}

	{#snippet children()}
		<PageHeader
			title={project ? project.title : 'Tasks'}
			description={project?.description || (!project ? 'All tasks in this workspace.' : '')}
			breadcrumbs={[
				{ label: workspaceName, href: `/app/dashboard?workspace=${workspaceId}` },
				{ label: project ? project.title : 'All tasks' }
			]}
		/>

		<form onsubmit={addTask} class="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
			<div class="flex gap-3">
				<input
					bind:value={newTask}
					placeholder={project ? `Add a task to ${project.title}...` : 'Add a task...'}
					class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 focus:ring-2 focus:ring-gray-900 focus:outline-none"
				/>
				<button
					type="submit"
					disabled={!newTask.trim() || !store?.connected}
					class="press-scale rounded-xl bg-gray-900 px-5 py-3 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
				>
					Add
				</button>
			</div>

			{#if data.members.length > 0}
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-xs font-medium text-gray-700">
							Assignees
							<span class="ml-1 font-normal text-gray-400"
								>({selectedAssignees.length} selected)</span
							>
						</span>
						{#if selectedAssignees.length > 0}
							<button
								type="button"
								onclick={() => (selectedAssignees = [])}
								class="text-xs text-gray-500 hover:text-gray-900"
							>
								Clear
							</button>
						{/if}
					</div>
					<div class="flex flex-wrap gap-2">
						{#each data.members as member (member.id)}
							{@const selected = selectedAssignees.includes(member.id)}
							<button
								type="button"
								onclick={() => toggleAssignee(member.id)}
								aria-pressed={selected}
								class={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
									selected
										? 'border-gray-900 bg-gray-900 text-white'
										: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
								}`}
							>
								<Avatar name={member.name} email={member.email} image={member.image} size="sm" />
								<span class="truncate">{member.name || member.email}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</form>

		<div class="grid gap-4 sm:grid-cols-3">
			{#each TASK_STATUS_OPTIONS as column (column.value)}
				{@const columnTasks = visibleTasks.filter((task) => task.status === column.value)}
				<section class="min-h-[300px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<header class="mb-4 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">{column.label}</span>
						<span class={`rounded-full px-2 py-0.5 text-xs ${column.accent}`}
							>{columnTasks.length}</span
						>
					</header>

					<div class="space-y-3">
						{#each columnTasks as task (task.id)}
							{@const assignees = assigneesForTask(task)}
							{@const linkedProject = task.projectId ? projectMap[task.projectId] : null}
							{@const isUpdating = store?.pendingTaskIds.includes(task.id) ?? false}
							<div
								in:fly={{ y: 6, duration: 180, easing: cubicOut }}
								out:scale={{ duration: 120, start: 0.96, opacity: 0 }}
								animate:flip={{ duration: 220 }}
								class="group rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-gray-300 hover:shadow-sm"
							>
								<div class="flex items-start justify-between gap-3">
									<p class="text-sm text-gray-800">{task.title}</p>
									<button
										type="button"
										onclick={() => openActivity(task.id)}
										class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
										aria-label={`Show activity for ${task.title}`}
										title="Show activity"
									>
										<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</button>
								</div>
								{#if !project && linkedProject}
									<div class="mt-2">
										<span
											class="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700"
										>
											{linkedProject.title}
										</span>
									</div>
								{/if}
								{#if assignees.length > 0}
									<div class="mt-2 flex flex-wrap gap-1.5">
										{#each assignees as assignee (assignee.id)}
											<span
												class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600"
											>
												<Avatar
													name={assignee.name}
													email={assignee.email}
													image={assignee.image}
													size="sm"
												/>
												<span>{assignee.name || assignee.email}</span>
											</span>
										{/each}
									</div>
								{/if}
								<div class="mt-2 flex gap-2">
									{#each TASK_STATUS_OPTIONS as option (option.value)}
										<button
											type="button"
											onclick={() => store?.updateStatus(task.id, option.value)}
											disabled={task.status === option.value || isUpdating}
											class={`press-scale rounded-md border px-2 py-1 text-xs ${
												option.value === task.status
													? 'font-medium ring-2 ring-gray-900'
													: 'opacity-50 hover:opacity-100'
											}`}
										>
											{option.label}
										</button>
									{/each}
								</div>
								{#if isUpdating}
									<p class="mt-2 text-[11px] text-amber-700">Updating status...</p>
								{/if}
							</div>
						{/each}

						{#if columnTasks.length === 0}
							<p class="text-xs text-gray-400" in:fade={{ duration: 150 }}>No tasks.</p>
						{/if}
					</div>
				</section>
			{/each}
		</div>
	{/snippet}
</AppShell>

<TaskActivityDrawer
	open={!!activityTaskId}
	taskTitle={activityTask?.title}
	entries={activityEntries}
	{memberMap}
	loading={activityLoading}
	error={activityError}
	onclose={closeActivity}
/>
