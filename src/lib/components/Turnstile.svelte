<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	let { token = $bindable(''), theme = 'light' }: { token: string; theme?: 'light' | 'dark' | 'auto' } = $props();

	let container: HTMLDivElement;
	let widgetId: string | undefined;

	onMount(() => {
		const sitekey = env.PUBLIC_TURNSTILE_SITE_KEY;
		if (!sitekey) {
			console.warn('[turnstile] PUBLIC_TURNSTILE_SITE_KEY not set');
			return;
		}

		function render() {
			if (!window.turnstile || !container) return;
			widgetId = window.turnstile.render(container, {
				sitekey,
				theme,
				callback: (t: string) => { token = t; },
				'expired-callback': () => { token = ''; },
				'error-callback': () => { token = ''; },
			});
		}

		if (window.turnstile) {
			render();
		} else {
			const interval = setInterval(() => {
				if (window.turnstile) {
					clearInterval(interval);
					render();
				}
			}, 100);
			return () => clearInterval(interval);
		}

		return () => {
			if (widgetId !== undefined && window.turnstile) {
				window.turnstile.remove(widgetId);
			}
		};
	});
</script>

<div bind:this={container} class="flex justify-center"></div>
