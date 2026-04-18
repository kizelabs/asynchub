<script lang="ts">
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import { slugify } from '$lib/utils';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';

  let name = $state('');
  let loading = $state(false);
  const previewSlug = $derived(name ? slugify(name) : 'workspace');

  let dialog = $state<{ open: boolean; variant: 'success' | 'error'; title: string; description: string }>({
    open: false,
    variant: 'success',
    title: '',
    description: '',
  });
</script>

<svelte:head>
  <title>Create Workspace | AsyncHub</title>
</svelte:head>

<Dialog
  open={dialog.open}
  variant={dialog.variant}
  title={dialog.title}
  description={dialog.description}
  onclose={() => {
    dialog.open = false;
    if (dialog.variant === 'success') goto('/app/dashboard');
  }}
/>

<AuthLayout title="Create your workspace" subtitle="Where your team will collaborate. You can rename this later.">
  <form
    method="POST"
    use:enhance={() => {
      loading = true;
      return async ({ result, update }) => {
        loading = false;
        if (result.type === 'failure') {
          const message = (result.data as { message?: string })?.message
            ?? 'Something went wrong. Please try again.';
          dialog = {
            open: true,
            variant: 'error',
            title: 'Failed to create workspace',
            description: message,
          };
          await update({ reset: false });
        } else if (result.type === 'error') {
          dialog = {
            open: true,
            variant: 'error',
            title: 'Something went wrong',
            description: result.error?.message ?? 'An unexpected error occurred.',
          };
        } else {
          // success (redirect) — show dialog then navigate
          dialog = {
            open: true,
            variant: 'success',
            title: 'Workspace created!',
            description: `"${name}" is ready. Let's get started.`,
          };
        }
      };
    }}
    class="space-y-4"
  >
    <Input
      id="workspaceName"
      name="workspaceName"
      label="Workspace name"
      bind:value={name}
      placeholder="e.g. Design Team"
      required
    />
    <p class="text-xs text-gray-500">
      URL preview: <span class="font-mono text-gray-700">asynchub.app/w/{previewSlug}-xxxx</span>
    </p>
    <Button type="submit" loading={loading} class="mt-4">Create workspace</Button>
  </form>
</AuthLayout>
