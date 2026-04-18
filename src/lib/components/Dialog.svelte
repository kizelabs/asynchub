<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    description?: string;
    variant?: 'success' | 'error';
    onclose?: () => void;
    children?: Snippet;
  }

  const { open, title, description, variant = 'success', onclose, children }: Props = $props();

  let dialogEl = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      dialogEl.showModal();
    } else {
      dialogEl.close();
    }
  });

  function handleCancel(e: Event) {
    e.preventDefault();
    onclose?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    const rect = dialogEl?.getBoundingClientRect();
    if (!rect) return;
    const clickedOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (clickedOutside) onclose?.();
  }

  const iconBg = $derived(variant === 'error' ? 'bg-red-100' : 'bg-green-100');
  const iconColor = $derived(variant === 'error' ? 'text-red-600' : 'text-green-600');
  const btnClass = $derived(variant === 'error'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-gray-900 hover:bg-gray-800');
</script>

<dialog
  bind:this={dialogEl}
  oncancel={handleCancel}
  onclick={handleBackdropClick}
  class="dialog-panel"
>
  <!-- Icon -->
  <div class="flex items-center justify-center w-10 h-10 rounded-full {iconBg} mx-auto mb-3">
    {#if variant === 'error'}
      <svg class="w-5 h-5 {iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    {:else}
      <svg class="w-5 h-5 {iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    {/if}
  </div>

  <h2 class="text-base font-semibold text-gray-900 text-center">{title}</h2>

  {#if description}
    <p class="mt-1.5 text-sm text-gray-500 text-center leading-snug">{description}</p>
  {/if}

  {#if children}
    <div class="mt-3">
      {@render children()}
    </div>
  {/if}

  {#if onclose}
    <button
      onclick={onclose}
      class="mt-4 w-full px-4 py-2 text-white text-sm font-medium rounded-lg transition focus:outline-none {btnClass}"
    >
      {variant === 'error' ? 'Dismiss' : 'Got it'}
    </button>
  {/if}
</dialog>

<style>
  .dialog-panel {
    border: none;
    outline: none;
    border-radius: 1rem;
    padding: 1.5rem;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    /* Center in viewport */
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
  }

  .dialog-panel::backdrop {
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .dialog-panel[open] {
    animation: scale-in 0.15s ease-out;
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
</style>
