<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	const workspaceId = $derived(data.workspace.id);
	const workspaceName = $derived(data.workspace.name);
	const userName = $derived(data.user.name ?? data.user.email.split('@')[0]);
	const roleColors: Record<string, string> = {
		owner: 'bg-purple-100 text-purple-800 border-purple-200',
		admin: 'bg-blue-100 text-blue-800 border-blue-200',
		member: 'bg-gray-100 text-gray-800 border-gray-200'
	};

	let showInviteDialog = $state(false);
	let inviteEmail = $state('');
	let inviting = $state(false);
	let copyFeedback = $state<string | null>(null);

	const origin = $derived(page.url.origin);

	function linkFor(token: string) {
		return `${origin}/invite/${token}`;
	}

	async function copy(text: string, key: string) {
		try {
			await navigator.clipboard.writeText(text);
			copyFeedback = key;
			setTimeout(() => {
				if (copyFeedback === key) copyFeedback = null;
			}, 1500);
		} catch {
			copyFeedback = null;
		}
	}

	function formatDate(d: string | Date) {
		const date = typeof d === 'string' ? new Date(d) : d;
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function initials(name: string | null | undefined, email: string) {
		const source = (name ?? '').trim() || email;
		return source
			.split(/\s+/)
			.map((s) => s[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}
</script>

<svelte:head><title>Members | {workspaceName}</title></svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-3">
					<a
						href={resolve(`/app/dashboard?workspace=${workspaceId}`)}
						aria-label="Back to dashboard"
						title="Back to dashboard"
					class="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</a>
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
					<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<span class="font-semibold text-gray-900">AsyncHub</span>
			</div>
			<div class="flex items-center gap-3">
				<span class="hidden text-sm text-gray-600 sm:block">{userName}</span>
				<a
					href={resolve('/auth/sign-out')}
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
					aria-label="Sign out"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Sign out
				</a>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl space-y-6 px-4 py-6">
		<!-- Title Section -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
					<nav class="mb-2 flex items-center gap-1 text-xs text-gray-500">
						<a
							href={resolve(`/app/dashboard?workspace=${workspaceId}`)}
							class="hover:text-gray-900"
							>{workspaceName}</a
						>
					<span>/</span>
					<span class="text-gray-700">Members</span>
				</nav>
				<h1 class="text-2xl font-semibold tracking-tight text-gray-900">Team Members</h1>
				<p class="mt-1 text-sm text-gray-600">
					Manage who has access to {workspaceName}.
				</p>
			</div>
			<button
				type="button"
				onclick={() => {
					showInviteDialog = true;
					inviteEmail = '';
				}}
				class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 hover:shadow-lg active:scale-95 active:bg-gray-950"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Invite Member
			</button>
		</div>

		<!-- Members -->
		<section class="rounded-xl border border-gray-200 bg-white">
			<header class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-gray-900">
					Members
					<span class="ml-1 text-xs font-normal text-gray-500">({data.members.length})</span>
				</h2>
			</header>
			{#if data.members.length === 0}
				<p class="px-5 py-6 text-sm text-gray-500">No members yet.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each data.members as member (member.id)}
						<li class="flex items-center justify-between px-5 py-3">
							<div class="flex min-w-0 items-center gap-3">
								{#if member.image}
									<img src={member.image} alt="" class="h-8 w-8 rounded-full object-cover" />
								{:else}
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600"
									>
										{initials(member.name, member.email)}
									</div>
								{/if}
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-gray-900">
										{member.name || 'Unnamed'}
									</p>
									<p class="truncate text-xs text-gray-500">{member.email}</p>
								</div>
							</div>
							<div class="ml-4 flex shrink-0 items-center gap-3">
								<span
									class={`rounded-full border px-2 py-0.5 text-xs font-medium ${roleColors[member.role] ?? roleColors.member}`}
								>
									{member.role}
								</span>
								<span class="hidden text-xs text-gray-500 sm:inline">
									Joined {formatDate(member.joinedAt)}
								</span>
								{#if member.id === data.user.id}
									<span class="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
										You
									</span>
								{:else if member.role !== 'owner'}
									<form
										method="POST"
										action="?/removeMember"
										use:enhance={() => async ({ update }) => {
											await update();
										}}
									>
										<input type="hidden" name="memberId" value={member.id} />
										<button
											type="submit"
											class="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
										>
											Remove
										</button>
									</form>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Pending invitations -->
		<section class="rounded-xl border border-gray-200 bg-white">
			<header class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
				<h2 class="text-sm font-semibold text-gray-900">
					Pending invitations
					<span class="ml-1 text-xs font-normal text-gray-500">({data.invitations.length})</span>
				</h2>
			</header>
			{#if data.invitations.length === 0}
				<p class="px-5 py-6 text-sm text-gray-500">No pending invitations.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each data.invitations as inv (inv.id)}
						<li class="flex flex-wrap items-center gap-3 px-5 py-3">
							<div class="flex min-w-0 flex-1 items-center gap-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600"
								>
									{initials(null, inv.email)}
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-gray-900">{inv.email}</p>
									<p class="mt-0.5 text-xs text-gray-500">
										Expires {formatDate(inv.expiresAt)}
									</p>
								</div>
							</div>
							<button
								type="button"
								onclick={() => copy(linkFor(inv.token), `inv-${inv.id}`)}
								class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
							>
								{copyFeedback === `inv-${inv.id}` ? 'Copied!' : 'Copy link'}
							</button>
							<form
								method="POST"
								action="?/revoke"
								use:enhance={() => async ({ update }) => {
									await update();
								}}
							>
								<input type="hidden" name="invitationId" value={inv.id} />
								<button
									type="submit"
									class="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
								>
									Revoke
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</main>
</div>

<!-- Invite Dialog -->
{#if showInviteDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 cursor-default bg-black/50"
			onclick={() => (showInviteDialog = false)}
			aria-label="Close dialog"
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
			<h2 class="mb-1 text-xl font-semibold text-gray-900">Invite a member</h2>
			<p class="mb-6 text-sm text-gray-500">
				We'll generate a link you can share. Anyone with the link and a matching email can join
				{workspaceName}.
			</p>

			{#if form?.invite && 'success' in form.invite && form.invite.success}
				{@const token = form.invite.token}
				{@const url = linkFor(token)}
				<div class="space-y-3">
					<p class="text-sm text-gray-700">
						Invitation for <span class="font-medium">{form.invite.email}</span> is ready.
					</p>
					<div class="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
						<input
							readonly
							value={url}
							class="min-w-0 flex-1 truncate bg-transparent text-xs text-gray-700 focus:outline-none"
							onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
						/>
						<button
							type="button"
							onclick={() => copy(url, 'new')}
							class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700"
						>
							{copyFeedback === 'new' ? 'Copied!' : 'Copy'}
						</button>
					</div>
					<div class="flex gap-3 pt-2">
						<button
							type="button"
							onclick={() => (showInviteDialog = false)}
							class="flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
						>
							Done
						</button>
					</div>
				</div>
			{:else}
				<form
					method="POST"
					action="?/invite"
					use:enhance={() => {
						inviting = true;
						return async ({ update }) => {
							inviting = false;
							await update();
						};
					}}
				>
					<div class="space-y-4">
						<div>
							<label for="inviteEmail" class="mb-1 block text-sm font-medium text-gray-700"
								>Email</label
							>
							<input
								type="email"
								id="inviteEmail"
								name="email"
								bind:value={inviteEmail}
								required
								placeholder="teammate@company.com"
								class="w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							/>
							{#if form?.invite && 'message' in form.invite}
								<p class="mt-2 text-xs text-red-600">{form.invite.message}</p>
							{/if}
						</div>
					</div>

					<div class="mt-6 flex gap-3">
						<button
							type="button"
							onclick={() => (showInviteDialog = false)}
							class="flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={inviting || !inviteEmail}
							class="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
						>
							{inviting ? 'Generating...' : 'Generate link'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
