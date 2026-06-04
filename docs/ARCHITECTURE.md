# Architecture

This document describes the project's runtime shape and module boundaries.

## Runtime shape

- App type: web app with JSON API endpoints.
- Framework/runtime: Hono on Node.js with strict TypeScript.
- Package manager: pnpm.
- Deployment target: Railway from GitHub.
- Persistence model: local JSON in `src/data/sweep.json`.
- Admin: `/admin` is protected by HTTP Basic authentication using `ADMIN_PASSWORD`.
- External data boundary: World Cup results are loaded through `src/services/worldCupProvider.ts`. Mock data is the default; API-FOOTBALL can be enabled with environment variables.

## Module boundaries

- `src/app` - Hono routes, server entrypoint, and HTML rendering.
- `src/config` - typed config and environment parsing.
- `src/data` - local JSON files.
- `src/domain` - framework-independent business rules.
- `src/services` - IO wrappers.
- `src/tests` - Vitest tests.
- `public/assets` - static browser assets served by Hono.

## Boundary rules

- Domain code does not import framework runtime APIs, filesystem, network, or database modules.
- UI rendering does not own persistence or network calls.
- IO sits behind service modules so it can be mocked or swapped in tests.
- Feature orchestration is separate from pure domain rules.
- Inject time, randomness, IDs, and external services when deterministic tests need control.

## Persistence

The sweep is stored in `src/data/sweep.json` and validated on read/write with Zod. The admin page writes to this JSON file.

Railway filesystem writes should be treated as operationally temporary across deploys/restarts. For a production sweep, either commit the finalized `src/data/sweep.json` after the draw or move to durable storage once admin edits need to survive platform lifecycle events automatically.

Move to a database only when JSON is unsuitable. Document the migration in `docs/DECISIONS.md` before or alongside the change.

## Validation

Environment variables, local JSON, and third-party API responses are validated with Zod.

## Configuration

Environment variables flow through `src/config/env.ts`, which loads local `.env` values before Zod validation. `RESULTS_PROVIDER=mock` is the local default. `RESULTS_PROVIDER=api-football` requires `API_FOOTBALL_KEY`. `/admin` requires `ADMIN_PASSWORD`.

## Testing

Vitest covers domain prize calculations and Hono route smoke tests. External providers are kept behind a service boundary so they can be mocked.

## Deployment

See `docs/DEPLOYMENT.md`.
