<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	const { data }: { data: PageData } = $props();
	let accepting = $state(false);
</script>

<svelte:head><title>Join {data.invite.workspaceName} | AsyncHub</title></svelte:head>

<div class="min-h-screen bg-gray-50 px-4 py-16">
	<div class="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
		<h1 class="text-2xl font-semibold tracking-tight text-gray-900">
			Join {data.invite.workspaceName}
		</h1>
		<p class="mt-2 text-sm text-gray-600">Invitation for <span class="font-medium">{data.invite.email}</span>.</p>

		{#if data.invite.state === 'ready'}
			<form
				method="POST"
				use:enhance={() => {
					accepting = true;
					return async ({ update }) => {
						accepting = false;
						await update();
					};
				}}
				class="mt-6"
			>
				<button
					type="submit"
					disabled={accepting}
					class="press-scale inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
				>
					{#if accepting}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
							<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" class="opacity-75"></path>
						</svg>
						Joining...
					{:else}
						Accept and join {data.invite.workspaceName}
					{/if}
				</button>
			</form>
		{:else if data.invite.state === 'email_mismatch'}
			<div class="mt-6 space-y-3">
				<p
					class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
				>
					You're signed in as <span class="font-medium">{data.session?.email}</span>, but this
					invite is for <span class="font-medium">{data.invite.email}</span>.
				</p>
				<a
					href="/auth/sign-out"
					class="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
				>
					Sign out and sign in with {data.invite.email}
				</a>
			</div>
		{:else if data.invite.state === 'expired'}
			<p class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
				This invitation has expired. Ask the workspace owner to send a new one.
			</p>
		{:else if data.invite.state === 'accepted'}
			<p
				class="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
			>
				This invitation has already been accepted.
			</p>
		{/if}
	</div>
</div>
