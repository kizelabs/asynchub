<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AppShell from '$lib/components/dashboard/AppShell.svelte';
	import Avatar from '$lib/components/dashboard/Avatar.svelte';
	import ModalPanel from '$lib/components/dashboard/ModalPanel.svelte';
	import PageHeader from '$lib/components/dashboard/PageHeader.svelte';
	import SectionCard from '$lib/components/dashboard/SectionCard.svelte';
	import { formatShortDate } from '$lib/presentation/formatters';

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
</script>

<svelte:head>
	<title>Members | {workspaceName}</title>
</svelte:head>

<AppShell
	{userName}
	backHref={`/app/dashboard?workspace=${workspaceId}`}
	backLabel="Back to dashboard"
>
	{#snippet children()}
		<PageHeader
			title="Team Members"
			description={`Manage who has access to ${workspaceName}.`}
			breadcrumbs={[
				{ label: workspaceName, href: `/app/dashboard?workspace=${workspaceId}` },
				{ label: 'Members' }
			]}
		>
			{#snippet actions()}
				<button
					type="button"
					onclick={() => {
						showInviteDialog = true;
						inviteEmail = '';
					}}
					class="press-scale inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 hover:shadow-lg active:bg-gray-950"
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
			{/snippet}
		</PageHeader>

		<SectionCard title="Members" count={data.members.length}>
			{#if data.members.length === 0}
				<p class="px-5 py-6 text-sm text-gray-500">No members yet.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each data.members as member (member.id)}
						<li class="flex items-center justify-between px-5 py-3">
							<div class="flex min-w-0 items-center gap-3">
								<Avatar name={member.name} email={member.email} image={member.image} />
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
									Joined {formatShortDate(member.joinedAt)}
								</span>
								{#if member.id === data.user.id}
									<span class="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500"
										>You</span
									>
								{:else if member.role !== 'owner'}
									<form
										method="POST"
										action="?/removeMember"
										use:enhance={() =>
											async ({ update }) => {
												await update();
											}}
									>
										<input type="hidden" name="memberId" value={member.id} />
										<button
											type="submit"
											class="press-scale rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
		</SectionCard>

		<SectionCard title="Pending invitations" count={data.invitations.length}>
			{#if data.invitations.length === 0}
				<p class="px-5 py-6 text-sm text-gray-500">No pending invitations.</p>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each data.invitations as invitation (invitation.id)}
						<li class="flex flex-wrap items-center gap-3 px-5 py-3">
							<div class="flex min-w-0 flex-1 items-center gap-3">
								<Avatar email={invitation.email} />
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-gray-900">{invitation.email}</p>
									<p class="mt-0.5 text-xs text-gray-500">
										Expires {formatShortDate(invitation.expiresAt)}
									</p>
								</div>
							</div>
							<button
								type="button"
								onclick={() => copy(linkFor(invitation.token), `inv-${invitation.id}`)}
								class="press-scale inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
							>
								{copyFeedback === `inv-${invitation.id}` ? 'Copied!' : 'Copy link'}
							</button>
							<form
								method="POST"
								action="?/revoke"
								use:enhance={() =>
									async ({ update }) => {
										await update();
									}}
							>
								<input type="hidden" name="invitationId" value={invitation.id} />
								<button
									type="submit"
									class="press-scale rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
								>
									Revoke
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</SectionCard>
	{/snippet}
</AppShell>

<ModalPanel
	open={showInviteDialog}
	title="Invite a member"
	description={`We'll generate a link you can share. Anyone with the link and a matching email can join ${workspaceName}.`}
	onclose={() => (showInviteDialog = false)}
>
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
					onclick={(event) => (event.currentTarget as HTMLInputElement).select()}
				/>
				<button
					type="button"
					onclick={() => copy(url, 'new')}
					class="press-scale rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
				>
					{copyFeedback === 'new' ? 'Copied!' : 'Copy'}
				</button>
			</div>
			<div class="flex gap-3 pt-2">
				<button
					type="button"
					onclick={() => (showInviteDialog = false)}
					class="press-scale flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
				>
					Close
				</button>
				<button
					type="button"
					onclick={() => {
						inviteEmail = '';
						copyFeedback = null;
					}}
					class="press-scale flex-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
				>
					Create another
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
			class="space-y-4"
		>
			<div>
				<label for="inviteEmail" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
				<input
					id="inviteEmail"
					name="email"
					type="email"
					bind:value={inviteEmail}
					required
					placeholder="teammate@company.com"
					class="w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
				{#if form?.invite && 'message' in form.invite && form.invite.message}
					<p class="mt-2 text-sm text-red-600">{form.invite.message}</p>
				{/if}
			</div>

			<div class="flex gap-3">
				<button
					type="button"
					onclick={() => (showInviteDialog = false)}
					class="press-scale flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={inviting || inviteEmail.length === 0}
					class="press-scale inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
				>
					{#if inviting}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								class="opacity-25"
							></circle>
							<path
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								class="opacity-75"
							></path>
						</svg>
						Creating...
					{:else}
						Create invite
					{/if}
				</button>
			</div>
		</form>
	{/if}
</ModalPanel>
