<script lang="ts">
	import AuthLayout from '$lib/components/AuthLayout.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';
	import { signIn } from '$lib/auth/client';
	import { signInSchema } from '$lib/validation';
	import { page } from '$app/state';

	// Only accept same-origin relative paths as callbackURL to prevent open redirects.
	const callbackURL = $derived.by(() => {
		const r = page.url.searchParams.get('redirect');
		return r && r.startsWith('/') && !r.startsWith('//') ? r : '/app/dashboard';
	});
	const prefilledEmail = page.url.searchParams.get('email') ?? '';
	const signUpHref = $derived.by(() => {
		const search = page.url.searchParams.toString();
		return search ? `/auth/sign-up?${search}` : '/auth/sign-up';
	});

	let email = $state(prefilledEmail);
	let password = $state('');
	let error = $state<string | null>(null);
	let validationError = $state<string | null>(null);
	let loading = $state(false);
	let googleLoading = $state(false);

	const isFormValid = $derived(signInSchema.safeParse({ email, password }).success);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		validationError = null;
		error = null;

		const res = signInSchema.safeParse({ email, password });
		if (!res.success) {
			validationError = res.error.flatten().fieldErrors.email?.[0] ?? 'Invalid input';
			return;
		}

		loading = true;
		const { error: authError } = await signIn.email({
			email,
			password,
			callbackURL,
			fetchOptions: { throw: false }
		});

		if (authError) error = authError.message ?? 'An unknown error occurred';
		loading = false;
	}
</script>

<AuthLayout title="Sign in" subtitle="Welcome back to AsyncHub.io">
	<form onsubmit={handleSubmit} class="space-y-1">
		<Input
			id="email"
			type="email"
			label="Email"
			bind:value={email}
			placeholder="you@company.com"
			required
		/>
		<Input
			id="password"
			type="password"
			label="Password"
			bind:value={password}
			placeholder="••••••••"
			required
		/>

		{#if error || validationError}
			<div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
				{error || validationError}
			</div>
		{/if}

		<Button type="submit" {loading} disabled={!isFormValid} class="mt-4">Sign in</Button>
	</form>

	<div class="relative my-6">
		<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
		<div class="relative flex justify-center text-sm"><span class="bg-white px-4 text-gray-500">or</span></div>
	</div>

	<button
		onclick={async () => {
			googleLoading = true;
			await signIn.social({ provider: 'google', callbackURL });
		}}
		disabled={googleLoading}
		class="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 px-4 py-2.5 transition hover:bg-gray-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
	>
		{#if googleLoading}
			<svg class="h-4 w-4 animate-spin text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<span class="text-sm font-medium text-gray-500">Redirecting...</span>
		{:else}
			<svg class="h-4 w-4" viewBox="0 0 24 24"
				><path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/><path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/><path
					fill="#FBBC05"
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
				/><path
					fill="#EA4335"
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				/></svg
			>
			<span class="text-sm font-medium text-gray-700">Continue with Google</span>
		{/if}
	</button>

	<p class="mt-6 text-center text-sm text-gray-600">
		Don't have an account?
		<!-- eslint-disable-next-line svelte/no-raw-href -->
		<a href={signUpHref} class="font-medium text-gray-900 hover:underline">Create one</a>
	</p>
</AuthLayout>
