<script lang="ts">
  let {
    id = undefined,
    name = undefined,
    type = "text",
    label = undefined,
    value = $bindable(),
    placeholder = undefined,
    required = false,
    class: className = "",
  }: {
    id?: string;
    name?: string;
    type?: string;
    label?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    class?: string;
  } = $props();
</script>

<div class="flex flex-col gap-1 {className}">
  {#if label}
    <label for={id} class="text-sm font-medium text-gray-700">{label}</label>
  {/if}
  <input
    {id}
    {name}
    {type}
    {placeholder}
    {required}
    bind:value
    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500 transition"
  />
</div>
