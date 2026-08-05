# AGENTS.md

## Project Context

Commun is the open source CMS of French communes and local authorities — AGPL v3,
self-hostable, sovereign. A collectivity manages its public site (news, agenda,
elected officials, projects, any custom collection) from a simple admin, and
publishes it as a fast, accessible static site. **Single-tenant by design: one
instance = one collectivity, its own SQLite database, its own media bucket, its
own container.** That constraint is the product, not a limitation — it is what
makes self-hosting and sovereignty real.

Four workspaces:

- **`@commun/core`** — business domains, Drizzle schema (SQLite via `bun:sqlite`),
  tRPC router. Holds all logic; knows nothing of transport.
- **`@commun/api`** — Nitro v3 instance (`:3001`). Serves the tRPC admin plane,
  a minimal legacy-compatible REST plane, scheduled tasks, and the built admin
  as static assets on the SAME origin.
- **`@commun/admin`** — Nuxt 4 admin, baked into the instance image.
- **`@commun/apidae-sync`** — tourism data connector (one client uses it).

Two are transitional and will leave: **`@commun/portal`** (login portal, migration
scaffolding) and **`packages/legacy-migrate`** (Mongo → SQLite CLI).

Product documentation lives in [`docs/`](./docs/). Specs, roadmap and operational
runbooks are deliberately kept OUT of this repository: the public repo is what
you self-host, not how the hosted service is operated.

## Coding Principles

1. **Think before coding.** State assumptions, ask when unclear, never pick
   silently between two readings.
2. **Simplicity first.** The minimum code that solves the problem. No speculative
   abstraction, no error handling for impossible states. Match the surrounding
   patterns.
3. **Fail loudly, and early.** Invalid configuration must break at boot, not on
   first use.
4. **Surgical changes.** Don't improve adjacent code, don't refactor what isn't
   broken. Every changed line traces back to the request.
5. **TypeScript strict.** `.ts` extension on imports, `import type` for types,
   handle `T | undefined` from indexed access. No `any`.
6. **A domain is self-contained.** `schema`, `dtos`, `repository`, `service` and
   `errors` live in the same folder. Never scatter one domain across parallel
   trees grouped by technical role.
7. **Export only what is consumed.** A type exported "just in case" is API
   surface you now maintain.
8. **Behaviour is specified by tests.** The E2E suite is the executable
   specification: describe behaviour in Gherkin, verify against the real
   application. Scenarios sharing in-memory state carry `@mode:serial`.

## Hard Constraints

- **The env schema is the ONLY configuration contract.** What the instance
  cannot run without is `required` in `common/env`; parsing fails at boot with a
  clear message. Never re-check a variable downstream — `if (!env.X) throw` after
  parsing means the schema lies about its own contract.
- **The core knows no provider.** It emits business events (`{ email, eventName,
  eventProperties }`) to a configured webhook; it never writes an email, never
  holds a provider key. A self-hoster must be free to plug in their own.
- **Domain errors carry a type and a code, nothing else.** No default message:
  the type identifies the error, the interface owns the wording.
- **Object storage is the only media backend.** Objects under `medias/` are
  served publicly and their URLs are frozen into static builds — they must never
  expire, and the instance must stay out of the traffic path so public sites
  survive a CMS outage.
- **Migrations are generated, never handwritten.** `bun run db:generate` after a
  schema change; review the SQL before committing.
- **Bun toolchain.** Bun is the package manager, runtime and test runner. `docs/`
  is an isolated sub-package with its own `bun install`.

## Comments

Write few. A comment justifies a decision; it does not narrate the code, and it
never records its history.

Does not belong in a comment: paraphrasing the next line; dates, PR numbers,
people, decision minutes — those live in commit messages; discarded alternatives
and their rationale.

Deserves one: a non-obvious invariant, a trap someone would otherwise reintroduce,
a constraint imposed from outside. If clearer code can replace the comment, write
the code instead.

```ts
// ✗ Le legacy signait ses URLs 7 jours (X-Amz-Expires=604800), or elles sont
//   figées dans un site statique… Décision Quentin du 31/07, voir PR #9.
// ✓ These URLs are frozen into static builds, so they must never expire.
```

## Commands

| Task | Command |
|---|---|
| Install | `bun install` (app); `bun run install:docs` (isolated docs) |
| Dev — everything | `bun run dev` |
| Dev — API only (`:3001`) | `bun run dev:api` |
| Dev — admin only | `bun run dev:admin` |
| Dev — docs | `bun run dev:docs` |
| Typecheck all | `bun run typecheck` |
| Lint | `bun run lint` (`lint:fix` to write) |
| E2E suite | `bun run test:e2e` |
| Generate a migration | `bun run db:generate` |
| Inspect the database | `bun run db:studio` |

## Working Etiquette

- French is fine in conversation, in product prose (README, `docs/`, interface)
  and in commit messages. **Code, identifiers, schemas and comments stay
  English.**
- Never run destructive git operations, and never push without being asked.
- Branch from `origin/main`, never from a stale local `main`.
- When a change no longer matches what was asked, say so and stop — do not widen
  the scope on your own.
