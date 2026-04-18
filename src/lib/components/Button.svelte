<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    type?: "submit" | "button" | "reset";
    variant?: "primary" | "outline";
    loading?: boolean;
    disabled?: boolean;
    class?: string;
    children: Snippet;
  }

  const { type = "button", variant = "primary", loading = false, disabled = false, class: className = "", children }: Props = $props();
</script>

<button
  {type}
  disabled={loading || disabled}
  class="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
  {variant === 'primary' ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
  {variant === 'outline' ? 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' : ''}
  {className}"
>
  {#if loading}
    <svg class="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  {@render children()}
</button>
