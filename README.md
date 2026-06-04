# World Cup Sweep Tracker

A Hono website for tracking a 2026 Football World Cup sweep with 16 participants, 3 teams each, and a $1,600 prize pool.

## Current Status

- App scaffold: Hono on Node.js with strict TypeScript.
- Package manager: pnpm.
- Persistence: local JSON sweep data in `src/data/sweep.json`.
- Deployment target: Railway via GitHub.
- Results provider: mock by default; API-FOOTBALL can be enabled with environment variables.

## Quick Start

```powershell
pnpm install
pnpm run dev
```

Then open:

```text
http://localhost:3000
```

## Admin

`/admin` lets you assign three teams to each participant and confirm the sweep is active. It is disabled until `ADMIN_PASSWORD` is set.

```powershell
$env:ADMIN_PASSWORD = "<local password>"
pnpm run dev
```

Use any username with that password when the browser prompts for HTTP Basic authentication.

## Live Results Provider

Local development runs with `RESULTS_PROVIDER=mock` so no API key is required.

To enable API-FOOTBALL:

```powershell
# In .env, which is ignored by git:
RESULTS_PROVIDER=api-football
API_FOOTBALL_KEY=<set locally, do not commit>

pnpm run dev
```

API-FOOTBALL may require a paid plan for the 2026 World Cup season. If the provider returns a plan error, the dashboard will show that message instead of silently displaying empty fixture data.

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
