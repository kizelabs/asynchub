<script lang="ts">
	interface WorkspaceOption {
		id: string;
		name: string;
	}

	interface Props {
		workspaces: WorkspaceOption[];
		activeWorkspaceId?: string | null;
		pendingWorkspaceId?: string | null;
		onselect?: (event: MouseEvent, workspaceId: string) => void;
	}

	const {
		workspaces,
		activeWorkspaceId = null,
		pendingWorkspaceId = null,
		onselect
	}: Props = $props();
</script>

{#if workspaces.length > 0}
	<div class="rounded-xl border border-gray-200 bg-white p-4">
		<h2 class="mb-3 text-sm font-medium text-gray-700">Select a workspace to get started</h2>
		<div class="flex flex-wrap gap-2">
			{#each workspaces as workspace (workspace.id)}
				{@const isActive = activeWorkspaceId === workspace.id}
				{@const isLoading = pendingWorkspaceId === workspace.id}
				<a
					href={`/app/dashboard?workspace=${workspace.id}`}
					onclick={(event) => onselect?.(event, workspace.id)}
					aria-current={isActive ? 'page' : undefined}
					aria-busy={isLoading}
					class="press-scale inline-flex items-center gap-2 rounded-lg border px-3 py-2 {isActive
						? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-700 hover:shadow-lg active:bg-gray-950'
						: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-700 hover:text-white hover:shadow-lg active:bg-gray-950'}"
				>
					{#if isLoading}
						<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
					{/if}
					<span class="text-sm font-medium">{workspace.name}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}
