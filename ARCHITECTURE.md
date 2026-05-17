# AsyncHub Architecture

## Overview

AsyncHub is a monolithic SvelteKit application with server-rendered pages, form actions, API routes, and a PostgreSQL database accessed through Drizzle. Authentication is provided by Better Auth, and the product domain is organized around workspaces, projects, tasks, and invitations.

The app currently optimizes for a simple deployment model:

- one SvelteKit application
- one PostgreSQL database
- one auth layer
- one SSE-based real-time path for task updates

## Runtime Architecture

### Client

- Svelte 5 components use runes-based local state
- Auth screens submit directly through Better Auth client helpers
- Dashboard screens use SvelteKit `load` data plus local UI state
- The tasks screen opens an `EventSource` connection to `/api/stream`

### Server

- `src/hooks.server.ts` initializes Better Auth per request and hydrates `locals.user` and `locals.session`
- Server `load` functions gate access and fetch workspace-scoped data
- Form `actions` handle onboarding, project creation, invitations, and membership management
- API routes handle task mutations and streaming updates

### Database

- PostgreSQL is accessed through Drizzle in `src/lib/db/index.ts`
- Schema and relations live in `src/lib/db/schema.ts`
- Better Auth shares the same database through the Drizzle adapter

## Main Modules

### Authentication

Files:

- [src/lib/auth/index.ts](/Users/kenshin/Projects/try/asynchub/src/lib/auth/index.ts:1)
- [src/lib/auth/client.ts](/Users/kenshin/Projects/try/asynchub/src/lib/auth/client.ts:1)
- [src/hooks.server.ts](/Users/kenshin/Projects/try/asynchub/src/hooks.server.ts:1)

Behavior:

- Better Auth is configured with email/password auth and social providers.
- Email/password sign-up requires email verification before sign-in.
- Auth state is read on the server and attached to `event.locals`.
- Client-side auth helpers expose `signIn`, `signUp`, `signOut`, and `useSession`.

Implication:

- Any post-sign-up UX must preserve the verification state rather than immediately sending the user to a blocked sign-in path.

### Routing And Access Control

Files:

- [src/routes/+layout.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/+layout.server.ts:1)
- [src/routes/app/+layout.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/app/+layout.server.ts:1)

Behavior:

- Root layout exposes the current user and session ID to the app.
- App layout redirects anonymous users to `/auth/sign-in`.
- App layout loads every workspace for the current user.
- The active workspace is selected from the `workspace` query param.
- If a user has no workspace membership, they are redirected to `/onboarding`.

Tradeoff:

- Workspace selection is URL-driven and explicit. If no `workspace` query param is present, the dashboard can render without an active workspace context.

### Onboarding And Workspace Creation

Files:

- [src/routes/onboarding/+page.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/onboarding/+page.server.ts:1)
- [src/lib/utils.ts](/Users/kenshin/Projects/try/asynchub/src/lib/utils.ts:1)
- [src/lib/validation.ts](/Users/kenshin/Projects/try/asynchub/src/lib/validation.ts:1)

Behavior:

- First-time users are sent to onboarding.
- Workspace creation is validated with Zod.
- Slugs are generated from the workspace name and randomized for uniqueness.
- Workspace creation and owner membership insertion run in a single transaction.

### Dashboard Domain

Files:

- [src/routes/app/dashboard/+page.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/app/dashboard/+page.server.ts:1)
- [src/routes/app/dashboard/projects/+page.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/app/dashboard/projects/+page.server.ts:1)
- [src/routes/app/dashboard/tasks/+page.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/app/dashboard/tasks/+page.server.ts:1)
- [src/routes/app/dashboard/members/+page.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/app/dashboard/members/+page.server.ts:1)

Behavior:

- Dashboard summaries derive project progress from task status counts.
- Projects belong to a workspace and can be created or updated through form actions.
- Tasks are shown either for a selected project or for the full workspace.
- Members and invitations are owner-only management surfaces.

### Invitations

Files:

- [src/routes/app/dashboard/members/+page.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/app/dashboard/members/+page.server.ts:1)
- [src/routes/invite/[token]/+page.server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/invite/[token]/+page.server.ts:1)

Behavior:

- Owners create invitation tokens with a 14-day TTL.
- A pending invitation is unique per workspace and email.
- Invite acceptance enforces email matching against the signed-in user.
- Unauthenticated invite visits redirect to sign-in or sign-up with `redirect` and `email` query params.

Design choice:

- Invitation fulfillment is handled in the main app, not through a separate invite service.

## Task System

### Write Path

Files:

- [src/routes/api/tasks/+server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/api/tasks/+server.ts:1)
- [src/routes/api/tasks/[id]/activity/+server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/api/tasks/[id]/activity/+server.ts:1)

Behavior:

- `POST /api/tasks` creates a task, optional assignee rows, and activity log entries in one transaction.
- `PATCH /api/tasks` updates task status and increments `version`.
- Activity entries record creation, status changes, and assignee additions.
- `GET /api/tasks/[id]/activity` returns the newest activity first.

Observations:

- Activity logging is append-only and simple to reason about.
- Task versioning is used as a lightweight sync signal rather than full conflict resolution.

### Realtime Path

Files:

- [src/routes/api/stream/+server.ts](/Users/kenshin/Projects/try/asynchub/src/routes/api/stream/+server.ts:1)
- [src/lib/sse/TaskStore.svelte.ts](/Users/kenshin/Projects/try/asynchub/src/lib/sse/TaskStore.svelte.ts:1)
- [src/routes/app/dashboard/tasks/+page.svelte](/Users/kenshin/Projects/try/asynchub/src/routes/app/dashboard/tasks/+page.svelte:1)

Behavior:

- The client subscribes to `/api/stream?workspace=<id>`.
- The server sends an initial `INIT` payload, periodic keepalive pings, and `SYNC` updates.
- The stream currently polls the database every 3 seconds.
- The task page also consumes `PROJECT_PROGRESS` updates for progress recalculation.

Tradeoffs:

- SSE is simpler to run behind serverless infrastructure than a WebSocket stack.
- Polling is operationally easy but not especially efficient.
- Change detection is coarse and currently relies on task ordering plus version comparison.

## Data Boundaries

### Workspace-Scoped Tables

- `workspaces`
- `workspace_members`
- `projects`
- `tasks`
- `task_assignees`
- `task_activity_log`
- `workspace_invitations`

### Auth Tables

- `user`
- `account`
- `session`
- `verification`

### Important Relationships

- a user can belong to many workspaces through `workspace_members`
- a workspace owns many projects, tasks, and invitations
- a project can contain many tasks
- a task can have many assignees and many activity log rows

## Validation Strategy

File:

- [src/lib/validation.ts](/Users/kenshin/Projects/try/asynchub/src/lib/validation.ts:1)

Approach:

- Zod validates auth inputs, workspace names, project titles, task titles, project status, and invitation email addresses.
- Validation is mostly applied in server actions and API handlers.
- Client forms derive validity from the same schemas where that logic is wired in.

## Configuration

Files:

- [package.json](/Users/kenshin/Projects/try/asynchub/package.json:1)
- [drizzle.config.ts](/Users/kenshin/Projects/try/asynchub/drizzle.config.ts:1)
- [svelte.config.js](/Users/kenshin/Projects/try/asynchub/svelte.config.js:1)

Current expectations:

- `DATABASE_URL` is required by both runtime DB access and Drizzle CLI.
- `BETTER_AUTH_SECRET` and `PUBLIC_APP_URL` are required for auth.
- GitHub and Google OAuth credentials are optional unless those providers are enabled in practice.
- The repo is set up for Vercel deployment through `@sveltejs/adapter-vercel`.

## Testing State

Current scripts:

- `bun run test:unit`
- `bun run test:e2e`

Current reality:

- The repository still contains starter Vitest example files.
- Playwright is configured, but meaningful domain coverage should be verified before treating the test suite as complete.

## Known Risks And Follow-Up Work

- API authorization around task creation and updates should be tightened to ensure the caller belongs to the target workspace.
- `.env.example` should be updated to match the actual environment variables read by the app.
- SSE change detection should not rely on the first returned task row version.
- If invite emails are intended to be sent automatically, an email delivery integration still needs to be documented or implemented.
