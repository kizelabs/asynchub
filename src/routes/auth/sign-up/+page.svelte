<script lang="ts">
  import AuthLayout from "$lib/components/AuthLayout.svelte";
  import Input from "$lib/components/Input.svelte";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Turnstile from "$lib/components/Turnstile.svelte";
  import { signUp } from "$lib/auth/client";
  import { signUpSchema } from "$lib/validation";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  // Only accept same-origin relative paths as callbackURL to prevent open redirects.
  const callbackURL = $derived.by(() => {
    const r = page.url.searchParams.get('redirect');
    return r && r.startsWith('/') && !r.startsWith('//') ? r : '/onboarding';
  });
  const prefilledEmail = page.url.searchParams.get('email') ?? '';
  const signInHref = $derived.by(() => {
    const search = page.url.searchParams.toString();
    return search ? `/auth/sign-in?${search}` : '/auth/sign-in';
  });

  let name = $state("");
  let email = $state(prefilledEmail);
  let password = $state("");
  let confirmPassword = $state("");
  let validationErrors = $state<Record<string, string[]>>({});
  let loading = $state(false);
  let turnstileToken = $state('');

  let dialog = $state<{ open: boolean; variant: 'success' | 'error'; title: string; description: string }>({
    open: false,
    variant: 'success',
    title: '',
    description: '',
  });

  const isFormValid = $derived(signUpSchema.safeParse({ name, email, password, confirmPassword }).success && !!turnstileToken);

  async function verifyTurnstile(): Promise<boolean> {
    if (!turnstileToken) {
      dialog = {
        open: true,
        variant: 'error',
        title: 'Captcha required',
        description: 'Please complete the captcha before submitting.',
      };
      return false;
    }
    try {
      const res = await fetch('/api/turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken })
      });
      if (!res.ok) {
        dialog = {
          open: true,
          variant: 'error',
          title: 'Verification failed',
          description: 'Captcha verification failed. Please try again.',
        };
        return false;
      }
      return true;
    } catch {
      dialog = {
        open: true,
        variant: 'error',
        title: 'Verification failed',
        description: 'Captcha verification failed. Please try again.',
      };
      return false;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    validationErrors = {};

    const res = signUpSchema.safeParse({ name, email, password, confirmPassword });
    if (!res.success) {
      validationErrors = res.error.flatten().fieldErrors;
      return;
    }

    loading = true;

    const captchaValid = await verifyTurnstile();
    if (!captchaValid) {
      loading = false;
      return;
    }

    const { error: authError } = await signUp.email({
      name, email, password,
      callbackURL,
      fetchOptions: { throw: false }
    });
    loading = false;

    if (authError) {
      dialog = {
        open: true,
        variant: 'error',
        title: 'Sign up failed',
        description: authError.message ?? 'An unknown error occurred. Please try again.',
      };
    } else {
      dialog = {
        open: true,
        variant: 'success',
        title: 'Account created!',
        description: `We sent a verification email to ${email}. Redirecting you to sign in...`,
      };
      const params = new URLSearchParams(page.url.searchParams);
      if (!params.has('email')) params.set('email', email);
      setTimeout(() => goto(`/auth/sign-in?${params.toString()}`), 1500);
    }
  }
</script>

<Dialog
  open={dialog.open}
  variant={dialog.variant}
  title={dialog.title}
  description={dialog.description}
  onclose={() => dialog.open = false}
/>

<AuthLayout title="Create account" subtitle="Join AsyncHub and start collaborating asynchronously.">
  <form onsubmit={handleSubmit} class="space-y-1">
    <Input id="name" label="Full Name" bind:value={name} placeholder="Jane Doe" required />
    <Input id="email" type="email" label="Email" bind:value={email} placeholder="you@company.com" required />
    <Input id="password" type="password" label="Password" bind:value={password} placeholder="••••••••" required />
    <Input id="confirmPassword" type="password" label="Confirm Password" bind:value={confirmPassword} placeholder="••••••••" required />

    <div class="mt-4">
      <Turnstile bind:token={turnstileToken} />
    </div>

    {#if Object.keys(validationErrors).length > 0}
      <div class="p-3 rounded-lg bg-red-50 text-sm text-red-700 border border-red-200 mt-4">
        <ul class="list-disc pl-4 space-y-1">
          {#each Object.entries(validationErrors) as [field, msgs] (field)}
            {#each msgs as msg, i (i)}<li>{msg}</li>{/each}
          {/each}
        </ul>
      </div>
    {/if}

    <Button type="submit" loading={loading} disabled={!isFormValid} class="mt-4">Create account</Button>
  </form>

  <p class="mt-6 text-center text-sm text-gray-600">
    Already have an account?
    <!-- eslint-disable-next-line svelte/no-raw-href -->
    <a href={signInHref} class="font-medium text-gray-900 hover:underline">Sign in</a>
  </p>
</AuthLayout>
