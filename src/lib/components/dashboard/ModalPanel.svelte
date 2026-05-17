<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		onclose: () => void;
		children: Snippet;
	}

	const { open, title, description = '', onclose, children }: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 cursor-default bg-black/50"
			onclick={onclose}
			aria-label="Close dialog"
			transition:fade={{ duration: 150 }}
		></button>
		<div
			class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
			transition:scale={{ duration: 180, start: 0.96, easing: cubicOut }}
		>
			<h2 class="mb-1 text-xl font-semibold text-gray-900">{title}</h2>
			{#if description}
				<p class="mb-6 text-sm text-gray-500">{description}</p>
			{/if}
			{@render children()}
		</div>
	</div>
{/if}
