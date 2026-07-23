# Architecture

This document describes the project's runtime shape and module boundaries.

## Runtime shape

- App type: private sweep-hosting web app with JSON API endpoints.
- Framework/runtime: Hono on Node.js with strict TypeScript.
- Package manager: pnpm.
- Deployment target: Railway from GitHub.
- Persistence model: Postgres JSONB app state when `DATABASE_URL` is set; local JSON fallback in `src/data/sweep.json`. The current saved document still preserves the old World Cup admin allocation state, but the public app is in `between_sweeps` mode and reads archived World Cup outcomes from `src/data/sweepArchives.ts`.
- Admin: `/admin` is protected by HTTP Basic authentication using `ADMIN_PASSWORD`.
- External data boundary: World Cup results are loaded through `src/services/worldCupProvider.ts`. football-data.org is the default free provider; mock, OpenFootball, and API-FOOTBALL remain selectable alternatives.
- Results cache: `src/services/worldCupSnapshotService.ts` keeps a cached snapshot and runs provider-specific server-side polling when the server starts.

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

## Sweep catalogue

The public app now has a lightweight sweep catalogue for a private one-admin hoster. `src/data/sweepEvents.ts` lists completed and planned sweeps, including the completed 2026 Football World Cup sweep, the planned 2026 AFL Grand Final player sweep, and the planned 2027 Women's FIFA World Cup team sweep.

This is deliberately not a full persistence migration yet. The catalogue supports the landing-page next-sweep message and `/sweeps` history page while preserving the existing production allocation/result data shape. A later migration can move events, allocations, participants, and results into relational or JSONB per-sweep documents.

Future sweep formats should conceptually support both API-backed and manual result entry. Tournament-team sweeps can continue using provider snapshots, while one-off player sweeps can add authenticated manual result entry without requiring an external API.

## Tracking

`src/domain/tracking.ts` combines the configured sweep, fixture snapshot, and 48-nation metadata into UI-ready participant and nation tracking for active tournament sweeps. It derives teams left, each participant's next match, all upcoming matches, all finalised matches, dashboard-limited match/result previews, live score fields, match ownership, and active or eliminated nation status.

`src/domain/playerSweep.ts` contains the first non-tournament template rule: single-match player sweeps can award separate first-goal-scorer and Norm Smith Medalist prizes. If the same player wins both events, both prize amounts are paid to that player's owner.

## Validation

Environment variables, local JSON, and third-party API responses are validated with Zod.

## Configuration

Environment variables flow through `src/config/env.ts`, which loads local `.env` values before Zod validation. `RESULTS_PROVIDER=football-data` is the default. Supported providers are `football-data`, `mock`, `openfootball`, and `api-football`. `RESULTS_PROVIDER=football-data` requires `FOOTBALL_DATA_KEY`; `RESULTS_PROVIDER=api-football` requires `API_FOOTBALL_KEY`. `DATABASE_URL` enables Postgres persistence. `/admin` requires `ADMIN_PASSWORD`.

## Results polling

Public API routes read from `WorldCupSnapshotService` rather than directly polling the provider on every page load. On a direct server run, the service starts a background polling loop and serves the latest cached snapshot. Public API reads also refresh stale cached snapshots according to the provider-specific polling decision, so serverless/on-demand requests can update live data without fetching the provider on every request.

- OpenFootball: full snapshot refresh every hour, or every five minutes during the hour after a match's nominal end time. Nominal end is kickoff plus two hours.
- football-data.org: requests opt into API version `v4.1` so live snapshots can include provider-supplied `minute` and `injuryTime` fields. Full snapshot refreshes run every ten minutes outside match windows. From 15 minutes before kickoff to kickoff, it refreshes relevant unfinished match IDs every minute. From kickoff to 125 minutes after kickoff, it refreshes relevant unfinished match IDs every 15 seconds unless the 18 calls/minute budget guard requires a slower interval. From 125 to 180 minutes after kickoff, it refreshes relevant unfinished match IDs every minute. Match-specific refreshes recalculate derived group standings from the refreshed match list.
- API-Football: full snapshot refresh every hour outside match windows. Around match windows, it refreshes only relevant fixture IDs every ten minutes. The match window is 15 minutes before kickoff through three hours after kickoff.
- Mock: hourly refresh.

Browser pages poll the app API, not football-data.org directly. Public pages refresh every 15 seconds while any tracked match is live, every minute around pre-match/finalisation windows, and every two minutes otherwise.

## Testing

Vitest covers domain prize calculations and Hono route smoke tests. External providers are kept behind a service boundary so they can be mocked.

## Deployment

See `docs/DEPLOYMENT.md`.
