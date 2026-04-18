# AsyncHub Architecture

## Stack Rationale
- **Svelte 5 + SvelteKit**: Runes (`$state`, `$derived`, `$effect`) replace legacy stores. Compile-time reactivity, minimal bundle size, excellent DX for async UI patterns.
- **Bun**: Local development & testing runtime. Fast module resolution, native TS execution. Production uses Vercel Node runtime for stability (documented tradeoff).
- **NeonDB + Drizzle**: Serverless Postgres with branch-per-PR workflows. Drizzle provides zero-runtime overhead, full TS inference, and explicit migration control.
- **Vercel**: Preview deployments per PR, edge caching for static assets, serverless functions for API routes.

## Data Flow
1. Client → SvelteKit Route (`+page.svelte`) → `$state` for local UI
2. Form/Action → `+page.server.ts` → Zod validation → Drizzle query
3. DB → Neon (pooled) → Drizzle returns typed results → Server renders/redirects
4. Real-time (Phase 2) → SSE → Optimistic UI → Background sync queue

## Remote-First Engineering Practices
- **Branch-per-PR DB**: Each PR spins up an isolated Neon branch via GitHub Actions. Preview URL + DB branch auto-linked.
- **Type Safety End-to-End**: Schema → Drizzle → Server Routes → Svelte Components. No `any`, explicit Zod validation on all inputs.
- **Observability Ready**: Structured logging, error boundaries, Sentry integration planned.
- **Async UX Patterns**: Loading states, conflict resolution notes, offline fallback hints baked into component contracts.

## Local Setup
1. `cp .env.example .env`
2. `bun install`
3. `bun db:push` (creates tables)
4. `bun dev`

## Known Limitations & Tradeoffs
- Vercel serverless cold starts vs Bun local speed: prod uses Node runtime, documented in `vercel.json`
- SSE replaces WebSockets for serverless compatibility; conflict resolution uses version timestamps
- No microservices/Kafka intentionally: single deploy unit reduces cognitive load & CI complexity

## Realtime Architecture
- **SSE over WebSockets**: Chosen for Vercel serverless compatibility. HTTP/2 multiplexing replaces raw TCP sockets.
- **Optimistic Updates**: UI mutates instantly. `PATCH` failures trigger automatic rollback to prevent UX drift.
- **Scaling Note**: Current polling interval (3s) works for <50 concurrent users. Production scale would use Upstash Redis Pub/Sub or Neon Webhooks for sub-100ms sync.
- **Connection Lifecycle**: `EventSource` cleanup tied to component unmount via `$effect`. Zero memory leaks during client-side routing.
