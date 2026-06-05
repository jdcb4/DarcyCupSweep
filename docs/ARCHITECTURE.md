# Architecture

This document describes the project's runtime shape and module boundaries.

## Runtime shape

- App type: web app with JSON API endpoints.
- Framework/runtime: Hono on Node.js with strict TypeScript.
- Package manager: pnpm.
- Deployment target: Railway from GitHub.
- Persistence model: Postgres JSONB app state when `DATABASE_URL` is set; local JSON fallback in `src/data/sweep.json`.
- Admin: `/admin` is protected by HTTP Basic authentication using `ADMIN_PASSWORD`.
- External data boundary: World Cup results are loaded through `src/services/worldCupProvider.ts`. Mock data is the default; OpenFootball can be enabled for public-domain fixtures and post-game results, and API-FOOTBALL can be enabled for paid near-real-time results.

## Module boundaries

- `src/app` - Hono routes, server entrypoint, and HTML rendering.
- `src/config` - typed config and environment parsing.
- `src/data` - local JSON files and static nation metadata.
- `src/domain` - framework-independent business rules and tracking derivation.
- `src/services` - IO wrappers for persistence and providers.
- `src/tests` - Vitest tests.
- `public/assets` - static browser assets served by Hono.

## Boundary rules

- Domain code does not import framework runtime APIs, filesystem, network, or database modules.
- UI rendering does not own persistence or network calls.
- IO sits behind service modules so it can be mocked or swapped in tests.
- Feature orchestration is separate from pure domain rules.
- Inject time, randomness, IDs, and external services when deterministic tests need control.

## Persistence

The sweep is stored through `src/services/sweepRepository.ts` and validated on read/write with Zod.

When `DATABASE_URL` is set, the repository reads and writes the `sweep` document in the Postgres `app_state` table as JSONB. `scripts/migrate.ts` creates the table and seeds it from `src/data/sweep.json` if the row is missing. When `DATABASE_URL` is not set, the repository falls back to writing `src/data/sweep.json` for simple local development.

Railway filesystem writes should be treated as operationally temporary across deploys/restarts, so Railway should use Postgres for admin-managed allocation data.

## Tracking

`src/domain/tracking.ts` combines the configured sweep, fixture snapshot, and 48-nation metadata into UI-ready participant and nation tracking. It derives teams left, each participant's next match, the next four upcoming matches, recent results, match ownership, and active or eliminated nation status.

## Validation

Environment variables, local JSON, and third-party API responses are validated with Zod.

## Configuration

Environment variables flow through `src/config/env.ts`, which loads local `.env` values before Zod validation. `RESULTS_PROVIDER=mock` is the local default. Supported providers are `mock`, `openfootball`, and `api-football`. `RESULTS_PROVIDER=api-football` requires `API_FOOTBALL_KEY`. `DATABASE_URL` enables Postgres persistence. `/admin` requires `ADMIN_PASSWORD`.

## Testing

Vitest covers domain prize calculations and Hono route smoke tests. External providers are kept behind a service boundary so they can be mocked.

## Deployment

See `docs/DEPLOYMENT.md`.
