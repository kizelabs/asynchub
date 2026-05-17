<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		count?: number | null;
		actions?: Snippet;
		children: Snippet;
	}

	const { title, count = null, actions, children }: Props = $props();
</script>

<section class="rounded-xl border border-gray-200 bg-white">
	<header class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
		<h2 class="text-sm font-semibold text-gray-900">
			{title}
			{#if count !== null}
				<span class="ml-1 text-xs font-normal text-gray-500">({count})</span>
			{/if}
		</h2>
		{#if actions}
			<div class="flex items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</header>

	{@render children()}
</section>
