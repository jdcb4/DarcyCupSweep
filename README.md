# World Cup Sweep Tracker

A Hono website for tracking a 2026 Football World Cup sweep with 16 participants, 3 teams each, and a $1,600 prize pool.

## Current Status

- App scaffold: Hono on Node.js with strict TypeScript.
- Package manager: pnpm.
- Persistence: Postgres when `DATABASE_URL` is set; local JSON fallback in `src/data/sweep.json`.
- Deployment target: Railway via GitHub.
- Results provider: football-data.org by default; OpenFootball, API-FOOTBALL, and mock providers remain selectable.

## Quick Start

```powershell
pnpm install
pnpm run dev
```

Then open:

```text
http://localhost:3000
```

For local Postgres-backed development:

```powershell
docker compose up -d postgres
$env:DATABASE_URL = "postgres://worldcup:worldcup@localhost:55432/worldcup"
pnpm run db:migrate
pnpm run dev
```

## Admin

`/admin` lets you drag all 48 participating nations into each participant's allocation and confirm the sweep is active. It is disabled until `ADMIN_PASSWORD` is set.
It also includes a protected control for manually refreshing the cached World Cup provider data.

```powershell
$env:ADMIN_PASSWORD = "<local password>"
pnpm run dev
```

Use any username with that password when the browser prompts for HTTP Basic authentication.

## Local Demo Views

These routes preview allocated sweep states without writing to Postgres or `src/data/sweep.json`:

- `/demo/allocated` - all teams allocated, no results yet.
- `/demo/results` - all teams allocated, first dozen games completed, with recent results and upcoming matches visible.

## Match Schedule

`/matches` shows all upcoming World Cup matches from the configured provider, grouped by Australian Eastern date with kickoff times shown for `Australia/Sydney`.

## Results Providers

Local development uses `RESULTS_PROVIDER=football-data` by default. Set `FOOTBALL_DATA_KEY` in `.env` for the free football-data.org World Cup feed.

Provider options:

- `football-data` - football-data.org World Cup data using `FOOTBALL_DATA_KEY`; default provider for fresher free match data.
- `mock` - built-in placeholder data.
- `openfootball` - public-domain World Cup fixture and post-game result data from `openfootball/worldcup`; useful for schedules, countdowns, and final scores once upstream updates.
- `api-football` - API-FOOTBALL integration for paid near-real-time data.

To use the default football-data.org provider:

```env
# In .env, which is ignored by git:
RESULTS_PROVIDER=football-data
FOOTBALL_DATA_KEY=<set locally, do not commit>
```

To run without any provider key:

```env
RESULTS_PROVIDER=mock
```

To enable OpenFootball:

```env
RESULTS_PROVIDER=openfootball
```

To enable API-FOOTBALL:

```env
# In .env, which is ignored by git:
RESULTS_PROVIDER=api-football
API_FOOTBALL_KEY=<set locally, do not commit>
```

```powershell
pnpm run dev
```

API-FOOTBALL may require a paid plan for the 2026 World Cup season. If the provider returns a plan error, the dashboard will show that message instead of silently displaying empty fixture data.

OpenFootball source: https://github.com/openfootball/worldcup. It is not live scoring, so update speed depends on when the upstream text files are updated after each match.

## Railway Database

Railway Postgres should expose `DATABASE_URL` to the app service. The Railway start command runs `pnpm run db:migrate` before starting the server so the `app_state` table exists before requests are served.

## Verification

```powershell
pnpm run verify
```

This runs TypeScript checking, ESLint, Vitest, and the production build.

## Documentation

Start with:

- `AGENTS.md`
- `docs/PROJECT_INDEX.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`

## License

No license has been chosen yet.
