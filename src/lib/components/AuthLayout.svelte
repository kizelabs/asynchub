<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    subtitle?: string;
    children: Snippet;
  }

  const { title, subtitle, children }: Props = $props();
</script>

<div class="min-h-screen flex flex-col items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
        {#if subtitle}
          <p class="mt-2 text-sm text-gray-500">{subtitle}</p>
        {/if}
      </div>
      {@render children()}
    </div>
    <p class="mt-6 text-center text-xs text-gray-500 leading-relaxed">
      By continuing, you agree to our
      <!-- eslint-disable-next-line svelte/no-raw-href -->
      <a href="/terms" class="underline hover:text-gray-800">Terms</a>
      and
      <!-- eslint-disable-next-line svelte/no-raw-href -->
      <a href="/privacy" class="underline hover:text-gray-800">Privacy Policy</a>.
    </p>
  </div>
</div>
