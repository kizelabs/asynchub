<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
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

	type ActivityEntry = {
		id: string;
		action: string;
		oldValue: string | null;
		newValue: string | null;
		createdAt: string;
		userId: string | null;
		userName: string | null;
		userEmail: string | null;
		userImage: string | null;
	};

	let activityTaskId = $state<string | null>(null);
	let activityEntries = $state<ActivityEntry[]>([]);
	let activityLoading = $state(false);
	let activityError = $state<string | null>(null);

	const activityTask = $derived(
		activityTaskId ? (store?.tasks.find((t) => t.id === activityTaskId) ?? null) : null
	);

	const memberMap = $derived.by(() =>
		Object.fromEntries(data.members.map((member) => [member.id, member]))
	);

	async function openActivity(taskId: string) {
		activityTaskId = taskId;
		activityEntries = [];
		activityError = null;
		activityLoading = true;
		try {
			const res = await fetch(`/api/tasks/${taskId}/activity`);
			if (!res.ok) throw new Error('Failed to load activity');
			const json = await res.json();
			activityEntries = json.activity ?? [];
		} catch (e) {
			activityError = e instanceof Error ? e.message : 'Failed to load activity';
		} finally {
			activityLoading = false;
		}
	}

	function closeActivity() {
		activityTaskId = null;
		activityEntries = [];
		activityError = null;
	}

	function formatAction(entry: ActivityEntry): string {
		switch (entry.action) {
			case 'created':
				return `created the task`;
			case 'status_changed':
				return `changed status from ${entry.oldValue ?? '?'} to ${entry.newValue ?? '?'}`;
			case 'assignees_added': {
				const ids = (entry.newValue ?? '').split(',').filter(Boolean);
				const names = ids.map((id) => memberMap[id]?.name || memberMap[id]?.email || 'Unknown');
				return `assigned ${names.join(', ')}`;
			}
			default:
				return entry.action;
		}
	}

	function formatAbsolute(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatRelative(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		const diffMs = Date.now() - d.getTime();
		const sec = Math.round(diffMs / 1000);
		if (sec < 10) return 'just now';
		if (sec < 60) return `${sec}s ago`;
		const min = Math.round(sec / 60);
		if (min < 60) return `${min}m ago`;
		const hr = Math.round(min / 60);
		if (hr < 24) return `${hr}h ago`;
		const day = Math.round(hr / 24);
		if (day < 7) return `${day}d ago`;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function actorLabel(entry: ActivityEntry): string {
		if (entry.userName && entry.userName.trim()) return entry.userName;
		if (entry.userEmail) return entry.userEmail;
		return 'Unknown user';
	}

	$effect(() => {
		const s = new TaskStore(workspaceId);
		store = s;
		return () => s.destroy();
	});

	const visibleTasks = $derived(
		(store?.tasks ?? []).filter((t) => (project ? t.projectId === project.id : true))
	);

	function assigneesForTask(task: TaskRecord) {
		return (task.assigneeIds ?? []).map((id) => memberMap[id]).filter((member) => Boolean(member));
	}

	function toggleAssignee(id: string) {
		selectedAssignees = selectedAssignees.includes(id)
			? selectedAssignees.filter((x) => x !== id)
			: [...selectedAssignees, id];
	}

	function initials(name: string, email: string) {
		const source = (name ?? '').trim() || email;
		return source
			.split(/\s+/)
			.map((s) => s[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	const addTask = async (e: Event) => {
		e.preventDefault();
		if (!newTask.trim() || !store) return;
		await store.addTask(newTask.trim(), workspaceId, project?.id ?? null, selectedAssignees);
		newTask = '';
		selectedAssignees = [];
	};

	const statusColumns = [
		{ value: 'todo', label: 'To Do', accent: 'bg-gray-100 text-gray-700' },
		{ value: 'in_progress', label: 'In Progress', accent: 'bg-amber-100 text-amber-800' },
		{ value: 'done', label: 'Done', accent: 'bg-green-100 text-green-800' }
	] as const;
</script>

<svelte:head>
	<title>{project ? project.title : 'Tasks'} | {workspaceName}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-3">
				<a
					href={resolve(`/app/dashboard?workspace=${workspaceId}`)}
					aria-label="Back to dashboard"
					title="Back to dashboard"
					class="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</a>
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
		<!-- Title Section -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<nav class="mb-2 flex items-center gap-1 text-xs text-gray-500">
					<a href={resolve(`/app/dashboard?workspace=${workspaceId}`)} class="hover:text-gray-900"
						>{workspaceName}</a
					>
					<span>/</span>
					<span class="text-gray-700">{project ? project.title : 'All tasks'}</span>
				</nav>
				<h1 class="text-2xl font-semibold tracking-tight text-gray-900">
					{project ? project.title : 'Tasks'}
				</h1>
				{#if project?.description}
					<p class="mt-1 text-gray-600">{project.description}</p>
				{:else if !project}
					<p class="mt-1 text-gray-600">All tasks in this workspace.</p>
				{/if}
			</div>
		</div>

		<!-- Add Task -->
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
							<span class="ml-1 font-normal text-gray-400">
								({selectedAssignees.length} selected)
							</span>
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
								{#if member.image}
									<img src={member.image} alt="" class="h-5 w-5 rounded-full object-cover" />
								{:else}
									<span
										class={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
											selected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
										}`}
									>
										{initials(member.name, member.email)}
									</span>
								{/if}
								<span class="truncate">{member.name || member.email}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</form>

		<!-- Kanban Columns -->
		<div class="grid gap-4 sm:grid-cols-3">
			{#each statusColumns as column (column.value)}
				{@const columnTasks = visibleTasks.filter((t) => t.status === column.value)}
				<section class="min-h-[300px] rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<header class="mb-4 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">{column.label}</span>
						<span class={`rounded-full px-2 py-0.5 text-xs ${column.accent}`}>
							{columnTasks.length}
						</span>
					</header>

					<div class="space-y-3">
						{#each columnTasks as task (task.id)}
							{@const assignees = assigneesForTask(task)}
							<div
								role="button"
								tabindex="0"
								onclick={() => openActivity(task.id)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openActivity(task.id);
									}
								}}
								in:fly={{ y: 6, duration: 180, easing: cubicOut }}
								out:scale={{ duration: 120, start: 0.96, opacity: 0 }}
								animate:flip={{ duration: 220 }}
								class="group press-scale cursor-pointer rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-gray-300 hover:shadow-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
							>
								<p class="text-sm text-gray-800">{task.title}</p>
								{#if assignees.length > 0}
									<div class="mt-2 flex flex-wrap gap-1.5">
										{#each assignees as assignee (assignee.id)}
											<span
												class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600"
											>
												{#if assignee.image}
													<img
														src={assignee.image}
														alt=""
														class="h-4 w-4 rounded-full object-cover"
													/>
												{:else}
													<span
														class="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[9px] font-medium text-gray-600"
													>
														{initials(assignee.name, assignee.email)}
													</span>
												{/if}
												<span>{assignee.name || assignee.email}</span>
											</span>
										{/each}
									</div>
								{/if}
								<div class="mt-2 flex gap-2">
									{#each statusColumns as opt (opt.value)}
										<button
											onclick={(e) => {
												e.stopPropagation();
												store?.updateStatus(task.id, opt.value);
											}}
											disabled={task.status === opt.value}
											class={`press-scale rounded-md border px-2 py-1 text-xs ${
												opt.value === task.status
													? 'font-medium ring-2 ring-gray-900'
													: 'opacity-50 hover:opacity-100'
											}`}
										>
											{opt.label}
										</button>
									{/each}
								</div>
							</div>
						{/each}
						{#if columnTasks.length === 0}
							<p class="text-xs text-gray-400" in:fade={{ duration: 150 }}>No tasks.</p>
						{/if}
					</div>
				</section>
			{/each}
		</div>
	</main>
</div>

<!-- Activity Drawer -->
{#if activityTaskId}
	<div class="fixed inset-0 z-50 flex">
		<button
			class="flex-1 cursor-default bg-black/40"
			onclick={closeActivity}
			aria-label="Close activity log"
			transition:fade={{ duration: 150 }}
		></button>
		<aside
			class="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-xl"
			aria-label="Task activity log"
			transition:fly={{ x: 300, duration: 240, easing: cubicOut }}
		>
			<header class="flex items-start justify-between border-b border-gray-200 px-5 py-4">
				<div class="min-w-0 pr-4">
					<p class="text-xs font-medium text-gray-500">Activity log</p>
					<h2 class="mt-0.5 truncate text-lg font-semibold text-gray-900">
						{activityTask?.title ?? 'Task'}
					</h2>
				</div>
				<button
					type="button"
					onclick={closeActivity}
					aria-label="Close"
					class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</header>

			<div class="flex-1 overflow-y-auto px-5 py-4">
				{#if activityLoading}
					<div class="flex items-center gap-2 text-sm text-gray-500" in:fade={{ duration: 120 }}>
						<svg class="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
						Loading activity...
					</div>
				{:else if activityError}
					<p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{activityError}
					</p>
				{:else if activityEntries.length === 0}
					<p class="text-sm text-gray-500">No activity recorded yet.</p>
				{:else}
					<ol class="relative space-y-5 border-l border-gray-200 pl-5">
						{#each activityEntries as entry (entry.id)}
							<li class="relative">
								<span
									class="absolute top-1 -left-[27px] flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 ring-2 ring-white"
								></span>
								<div class="flex items-start gap-3">
									{#if entry.userImage}
										<img
											src={entry.userImage}
											alt=""
											class="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover"
										/>
									{:else}
										<span
											class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600"
										>
											{initials(entry.userName ?? '', entry.userEmail ?? '?')}
										</span>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="text-sm text-gray-900">
											<span class="font-semibold">{actorLabel(entry)}</span>
											<span class="text-gray-600"> {formatAction(entry)}</span>
										</p>
										<p class="mt-0.5 text-xs text-gray-500" title={formatAbsolute(entry.createdAt)}>
											{formatRelative(entry.createdAt)}
											<span class="text-gray-400">· {formatAbsolute(entry.createdAt)}</span>
										</p>
									</div>
								</div>
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</aside>
	</div>
{/if}
