<script lang="ts">
	import Avatar from '$lib/components/dashboard/Avatar.svelte';
	import { formatDateTime, formatRelativeTime } from '$lib/presentation/formatters';
	import { actorLabel, formatTaskActivity, type TaskActivityEntry } from '$lib/presentation/tasks';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface MemberLookup {
		[id: string]: {
			name?: string | null;
			email: string;
		};
	}

	interface Props {
		open: boolean;
		taskTitle?: string | null;
		entries: TaskActivityEntry[];
		memberMap: MemberLookup;
		loading: boolean;
		error?: string | null;
		onclose: () => void;
	}

	const {
		open,
		taskTitle = null,
		entries,
		memberMap,
		loading,
		error = null,
		onclose
	}: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex">
		<button
			class="flex-1 cursor-default bg-black/40"
			onclick={onclose}
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
						{taskTitle ?? 'Task'}
					</h2>
				</div>
				<button
					type="button"
					onclick={onclose}
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
				{#if loading}
					<div class="flex items-center gap-2 text-sm text-gray-500">
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
				{:else if error}
					<p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{error}
					</p>
				{:else if entries.length === 0}
					<p class="text-sm text-gray-500">No activity recorded yet.</p>
				{:else}
					<ol class="relative space-y-5 border-l border-gray-200 pl-5">
						{#each entries as entry (entry.id)}
							<li class="relative">
								<span
									class="absolute top-1 -left-[27px] flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 ring-2 ring-white"
								></span>
								<div class="flex items-start gap-3">
									<Avatar
										name={entry.userName}
										email={entry.userEmail ?? '?'}
										image={entry.userImage}
									/>
									<div class="min-w-0 flex-1">
										<p class="text-sm text-gray-900">
											<span class="font-semibold">{actorLabel(entry)}</span>
											<span class="text-gray-600"> {formatTaskActivity(entry, memberMap)}</span>
										</p>
										<p class="mt-0.5 text-xs text-gray-500" title={formatDateTime(entry.createdAt)}>
											{formatRelativeTime(entry.createdAt)}
											<span class="text-gray-400">· {formatDateTime(entry.createdAt)}</span>
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
