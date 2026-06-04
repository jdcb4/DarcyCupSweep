# Project Index

The first stop for navigating this project. Keep this file factual: it describes the project as it exists now.

## What this project is

World Cup Sweep Tracker is a Hono website for tracking a 16-participant 2026 Football World Cup sweep. Each participant receives three teams, the buy-in is $100, and the app tracks the $1,600 prize pool against group-winner, runner-up, and champion outcomes.

## Current setup state

- App scaffold: Hono on Node.js with strict TypeScript.
- Git repository: initialized.
- Package manager: pnpm.
- Runtime/deployment target: Railway via GitHub.
- Persistence: local JSON data in `src/data/sweep.json`.

## Important folders

- `src/app` - Hono routes, server entrypoint, and HTML rendering.
- `src/config` - typed environment parsing.
- `src/data` - local JSON sweep data.
- `src/domain` - framework-independent sweep rules and prize calculations.
- `src/services` - IO wrappers for local data and World Cup providers.
- `src/tests` - Vitest tests.
- `public/assets` - static CSS, browser JavaScript, and local visual assets.
- `docs` - durable project documentation.
- `scripts` - deterministic project utility scripts, currently reserved.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the development server. |
| `pnpm run typecheck` | TypeScript checking. |
| `pnpm run lint` | ESLint. |
| `pnpm test` | Vitest once. |
| `pnpm run test:watch` | Vitest in watch mode. |
| `pnpm run build` | Production build. |
| `pnpm run verify` | Typecheck + lint + test + build. |

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

