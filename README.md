# AsyncHub

AsyncHub is a SvelteKit app for async team collaboration. The current codebase focuses on workspace setup, project and task tracking, member invitations, and a lightweight real-time task board powered by Server-Sent Events.

## What It Does

- Email/password authentication with email verification via Resend
- Google OAuth sign-in via Better Auth
- Workspace onboarding for first-time users
- Multi-workspace membership with workspace-scoped dashboard views
- Project management with computed progress from task completion
- Task creation, assignee tracking, status updates, and activity history
- Invitation-based workspace membership with email notifications
- SSE-based task synchronization for the task board

## Stack

- Svelte 5 + SvelteKit 2
- TypeScript
- Tailwind CSS 4
- Better Auth (email/password + Google OAuth)
- Drizzle ORM + PostgreSQL (Neon serverless)
- Resend (transactional emails)
- Vercel adapter
- Bun for local scripts
- Vitest + Playwright

## Application Flow

1. A new user signs up from `/auth/sign-up`.
2. Better Auth creates the account and sends a verification email via Resend.
3. The user clicks the verification link to activate their account and is auto-signed in.
4. After signing in, users without a workspace are redirected to `/onboarding`.
5. Onboarding creates a workspace and an owner membership.
6. Authenticated users work inside `/app/dashboard`, scoped to a selected workspace via the `workspace` query param.
7. Owners can invite members from the members screen — an invitation email is sent via Resend with a `/invite/[token]` link.
8. Tasks are created and updated through API routes and synchronized to the client with SSE.

## Key Routes

- `/` — marketing/landing page
- `/auth/sign-in` — sign-in form (email/password + Google OAuth)
- `/auth/sign-up` — sign-up form with redirect-safe invite support
- `/onboarding` — first-workspace creation
- `/app/dashboard` — workspace overview and project summary
- `/app/dashboard/projects` — project listing with progress
- `/app/dashboard/tasks` — live task board and activity log
- `/app/dashboard/members` — membership and invitation management
- `/invite/[token]` — invitation acceptance flow
- `/api/tasks` — task create and status update API
- `/api/tasks/[id]/activity` — task activity feed
- `/api/stream` — SSE stream for workspace task sync
- `/api/auth/*` — Better Auth endpoints (handled by hooks.server.ts)

## Data Model

The main domain tables live in `src/lib/db/schema.ts`.

- `user`, `account`, `session`, `verification` — Better Auth tables
- `workspaces` — workspace records
- `workspace_members` — membership and role (`owner` or `member`)
- `projects` — workspace projects
- `tasks` — workspace tasks with `status` and optimistic sync `version`
- `task_assignees` — task-to-user assignments
- `task_activity_log` — audit trail for task events
- `workspace_invitations` — invitation tokens, expiry, and acceptance state

## Local Setup

### 1. Install dependencies

```sh
bun install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

Required variables:

```env
DATABASE_URL="postgres://user:password@host:port/db-name"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
PUBLIC_APP_URL="http://localhost:5173"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend (transactional emails)
RESEND_API_KEY="re_your_api_key"
RESEND_FROM_EMAIL="AsyncHub <noreply@yourdomain.com>"
```

#### Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:5173/api/auth/callback/google`

#### Resend setup

1. Create an account at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. For production, verify your sending domain
4. For development, use `onboarding@resend.dev` as the from address or send only to your account email

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
bun run dev          # Start dev server
bun run build        # Production build
bun run preview      # Preview production build
bun run check        # Type check
bun run lint         # Lint + format check
bun run format       # Auto-format
bun run test:unit    # Unit tests
bun run test:e2e     # End-to-end tests
bun run db:push      # Push schema to database
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio
```

## Architecture Notes

- **Auth**: Wired in `src/hooks.server.ts` (session + svelteKitHandler) and `src/lib/auth/index.ts` (Better Auth config).
- **Email**: Centralized in `src/lib/server/email.ts` using Resend. Handles verification, password reset, and workspace invitation emails.
- **Database**: Drizzle ORM with PostgreSQL, centralized in `src/lib/db/`.
- **Real-time**: `src/lib/sse/TaskStore.svelte.ts` connects to `/api/stream` for live task updates.
- **Deployment**: Vercel via `@sveltejs/adapter-vercel`.
- **CI**: GitHub Actions runs unit tests + Playwright e2e on push/PR.

## Current Gaps

- The SSE stream polls the database every 3 seconds instead of using a push backend.
- `/api/tasks` accepts workspace IDs directly and currently has limited workspace authorization checks compared with the page-level guards.
