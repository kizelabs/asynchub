<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	interface Props {
		userName?: string | null;
		backHref?: string | null;
		backLabel?: string;
		status?: Snippet;
		children: Snippet;
	}

	const {
		userName = null,
		backHref = null,
		backLabel = 'Back',
		status,
		children
	}: Props = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-3">
				{#if backHref}
					<a
						href={backHref}
						aria-label={backLabel}
						title={backLabel}
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
				{/if}
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
				{#if status}
					{@render status()}
				{/if}
				{#if userName}
					<span class="hidden text-sm text-gray-600 sm:block">{userName}</span>
				{/if}
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
		{@render children()}
	</main>
</div>
