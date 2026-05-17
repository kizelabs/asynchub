<script lang="ts">
	import type { Snippet } from 'svelte';

	type Breadcrumb = {
		label: string;
		href?: string;
	};

	interface Props {
		title: string;
		description?: string;
		breadcrumbs?: Breadcrumb[];
		actions?: Snippet;
	}

	const { title, description = '', breadcrumbs = [], actions }: Props = $props();
</script>

<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div>
		{#if breadcrumbs.length > 0}
			<nav class="mb-2 flex items-center gap-1 text-xs text-gray-500">
				{#each breadcrumbs as breadcrumb, index (breadcrumb.label + index)}
					{#if index > 0}
						<span>/</span>
					{/if}
					{#if breadcrumb.href}
						<a href={breadcrumb.href} class="hover:text-gray-900">{breadcrumb.label}</a>
					{:else}
						<span class="text-gray-700">{breadcrumb.label}</span>
					{/if}
				{/each}
			</nav>
		{/if}
		<h1 class="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
		{#if description}
			<p class="mt-1 text-sm text-gray-600">{description}</p>
		{/if}
	</div>

	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
