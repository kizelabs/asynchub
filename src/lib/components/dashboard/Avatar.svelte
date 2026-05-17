<script lang="ts">
	import { initials } from '$lib/presentation/formatters';

	interface Props {
		name?: string | null;
		email: string;
		image?: string | null;
		size?: 'sm' | 'md';
	}

	const { name = null, email, image = null, size = 'md' }: Props = $props();

	const sizeClass = $derived(size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-8 w-8 text-xs');
</script>

{#if image}
	<img src={image} alt="" class={`rounded-full object-cover ${sizeClass}`} />
{:else}
	<div
		class={`flex items-center justify-center rounded-full bg-gray-100 font-medium text-gray-600 ${sizeClass}`}
	>
		{initials(name, email)}
	</div>
{/if}
