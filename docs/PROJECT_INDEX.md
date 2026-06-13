# Project Index

The first stop for navigating this project. Keep this file factual: it describes the project as it exists now.

## What this project is

World Cup Sweep Tracker is a Hono website for tracking a 16-participant 2026 Football World Cup sweep. Each participant receives three teams, the buy-in is $100, and the app tracks the $1,600 prize pool against group-winner, runner-up, and champion outcomes.

## Current setup state

- App scaffold: Hono on Node.js with strict TypeScript.
- Git repository: initialized.
- Package manager: pnpm.
- Runtime/deployment target: Railway via GitHub.
- Persistence: Postgres when `DATABASE_URL` is set; local JSON fallback in `src/data/sweep.json`.

## Important folders

- `src/app` - Hono routes, server entrypoint, and HTML rendering.
- `src/config` - typed environment parsing.
- `src/data` - local JSON sweep data, static nation metadata, and fixed demo snapshots.
- `src/domain` - framework-independent sweep rules, prize calculations, and tracking derivation.
- `src/services` - IO wrappers for sweep persistence, World Cup providers, and server-side snapshot polling.
- `src/tests` - Vitest tests.
- `public/assets` - static CSS, browser JavaScript, and local visual assets.
- `docs` - durable project documentation.
- `scripts` - deterministic project utility scripts, including database migration.
- `docker-compose.yml` - local Postgres service on host port `55432`.

## Commands

| Command                  | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `pnpm run dev`           | Start the development server.                                            |
| `pnpm run db:migrate`    | Create and seed the Postgres app state table when `DATABASE_URL` is set. |
| `pnpm run typecheck`     | TypeScript checking.                                                     |
| `pnpm run lint`          | ESLint.                                                                  |
| `pnpm test`              | Vitest once.                                                             |
| `pnpm run test:watch`    | Vitest in watch mode.                                                    |
| `pnpm run build`         | Production build.                                                        |
| `pnpm run start:railway` | Run database migration, then start the production server.                |
| `pnpm run verify`        | Typecheck + lint + test + build.                                         |

## Demo routes

- `/demo/allocated` - allocated teams, no results.
- `/demo/results` - allocated teams, first dozen games completed.

## User routes

- `/` - sweep dashboard.
- `/matches` - all upcoming matches with Australian Eastern kickoff times.
- `/finalised-matches` - all finalised matches with final scores and sweep ownership.

## Key docs

- [`../AGENTS.md`](../AGENTS.md) - every-turn agent ruleset.
- [`INITIALISE.md`](INITIALISE.md) - first setup pass for a fresh folder.
- [`AGENT_REFERENCE.md`](AGENT_REFERENCE.md) - detailed agent reference.
- [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md) - colour, type, and layout token system.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - module boundaries and runtime shape.
- [`VERIFICATION.md`](VERIFICATION.md) - required checks once tooling exists.
- [`VERSIONING.md`](VERSIONING.md) - version rules.
- [`DECISIONS.md`](DECISIONS.md) - durable decisions.
- [`ROADMAP.md`](ROADMAP.md) - future ideas only, not active work.
- [`CHANGELOG.md`](CHANGELOG.md) - notable changes by version.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) - deploy instructions.
- [`../SECURITY.md`](../SECURITY.md) - security rules.
