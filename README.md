# AsyncHub

AsyncHub is a SvelteKit app for async team collaboration. The current codebase focuses on workspace setup, project and task tracking, member invitations, and a lightweight real-time task board powered by Server-Sent Events.

## What It Does

- Email/password authentication with required email verification
- GitHub and Google OAuth sign-in hooks via Better Auth
- Workspace onboarding for first-time users
- Multi-workspace membership with workspace-scoped dashboard views
- Project management with computed progress from task completion
- Task creation, assignee tracking, status updates, and activity history
- Invitation-based workspace membership using tokenized invite links
- SSE-based task synchronization for the task board

## Stack

- Svelte 5 + SvelteKit 2
- TypeScript
- Tailwind CSS 4
- Better Auth
- Drizzle ORM + PostgreSQL
- Vercel adapter
- Bun for local scripts
- Vitest + Playwright

## Application Flow

1. A new user signs up from `/auth/sign-up`.
2. Better Auth creates the account and requires email verification before sign-in.
3. After signing in, users without a workspace are redirected to `/onboarding`.
4. Onboarding creates a workspace and an owner membership.
5. Authenticated users work inside `/app/dashboard`, scoped to a selected workspace via the `workspace` query param.
6. Owners can invite members from the members screen and share `/invite/[token]` links.
7. Tasks are created and updated through API routes and synchronized to the client with SSE.

## Key Routes

- `/` marketing or landing entry point
- `/auth/sign-in` sign-in form
- `/auth/sign-up` sign-up form with redirect-safe invite support
- `/onboarding` first-workspace creation
- `/app/dashboard` workspace overview and project summary
- `/app/dashboard/projects` project listing with progress
- `/app/dashboard/tasks` live task board and activity log
- `/app/dashboard/members` membership and invitation management
- `/invite/[token]` invitation acceptance flow
- `/api/tasks` task create and status update API
- `/api/tasks/[id]/activity` task activity feed
- `/api/stream` SSE stream for workspace task sync

## Data Model

The main domain tables live in [src/lib/db/schema.ts](/Users/kenshin/Projects/try/asynchub/src/lib/db/schema.ts:1).

- `user`, `account`, `session`, `verification`: Better Auth tables
- `workspaces`: workspace records
- `workspace_members`: membership and role (`owner` or `member`)
- `projects`: workspace projects
- `tasks`: workspace tasks with `status` and optimistic sync `version`
- `task_assignees`: task-to-user assignments
- `task_activity_log`: audit trail for task events
- `workspace_invitations`: invitation tokens, expiry, and acceptance state

## Local Setup

### 1. Install dependencies

```sh
bun install
```

### 2. Configure environment variables

Create a `.env` file. At minimum, the current code expects:

```env
DATABASE_URL="postgres://..."
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
PUBLIC_APP_URL="http://localhost:5173"
```

Optional providers configured in code:

```env
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Note: `.env.example` is currently incomplete. The app code reads `PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` as well.

### 3. Push the schema

```sh
bun run db:push
```

### 4. Start the app

```sh
bun run dev
```

## Useful Commands

```sh
bun run dev
bun run build
bun run preview
bun run check
bun run lint
bun run format
bun run test:unit
bun run test:e2e
bun run db:generate
bun run db:migrate
bun run db:studio
```

## Repository Notes

- The app adapter is Vercel via [svelte.config.js](/Users/kenshin/Projects/try/asynchub/svelte.config.js:1).
- Auth is wired in [src/hooks.server.ts](/Users/kenshin/Projects/try/asynchub/src/hooks.server.ts:1) and [src/lib/auth/index.ts](/Users/kenshin/Projects/try/asynchub/src/lib/auth/index.ts:1).
- Database access is centralized in [src/lib/db/index.ts](/Users/kenshin/Projects/try/asynchub/src/lib/db/index.ts:1).
- The real-time task UI uses [src/lib/sse/TaskStore.svelte.ts](/Users/kenshin/Projects/try/asynchub/src/lib/sse/TaskStore.svelte.ts:1) with `/api/stream`.
- Current test files still include starter Vitest examples under `src/lib/vitest-examples`.

## Current Gaps

- The SSE stream polls the database every 3 seconds instead of using a push backend.
- `/api/tasks` accepts workspace IDs directly and currently has limited workspace authorization checks compared with the page-level guards.
- Environment documentation in the repo was previously out of sync with the code.

See [ARCHITECTURE.md](/Users/kenshin/Projects/try/asynchub/ARCHITECTURE.md:1) for a deeper breakdown of runtime behavior and module boundaries.
