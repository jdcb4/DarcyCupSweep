# Deployment

## Target

Railway from GitHub using Nixpacks.

## Build

```powershell
pnpm install --frozen-lockfile
pnpm run build
```

Railway uses the equivalent build command recorded in `railway.json`.

## Start

```powershell
pnpm run start:railway
```

Railway runs the migration script and then starts the app. The app listens on `PORT`, which Railway provides.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Railway provides | Server port. |
| `RESULTS_PROVIDER` | No | `mock` by default, or `openfootball` / `api-football`. |
| `ADMIN_PASSWORD` | Yes for `/admin` | Password for HTTP Basic authentication on `/admin`. |
| `DATABASE_URL` | Yes for Railway persistence | Railway Postgres connection string. Enables durable admin allocation writes. |
| `API_FOOTBALL_KEY` | Only for API-FOOTBALL | API-FOOTBALL key. Store as a Railway secret, never in git. |
| `API_FOOTBALL_BASE_URL` | No | Defaults to `https://v3.football.api-sports.io`. |
| `OPENFOOTBALL_BASE_URL` | No | Defaults to `https://raw.githubusercontent.com/openfootball/worldcup/master/2026--usa`. |

## Deploy Flow

1. Push to GitHub.
2. Connect the repository in Railway.
3. Attach a Railway Postgres database so `DATABASE_URL` is available to the app service.
4. Set `ADMIN_PASSWORD`.
5. Set `RESULTS_PROVIDER=openfootball` for public fixture data, or `RESULTS_PROVIDER=api-football` and `API_FOOTBALL_KEY` if paid live data is required.
6. Railway builds with Nixpacks and starts `pnpm run start:railway`.

## Verification Before Deploy

```powershell
pnpm run verify
```

## Rollback

Use Railway's deployment history to roll back to the previous successful deployment.

## Local verification before deploy

For a local database smoke test:

```powershell
docker compose up -d postgres
$env:DATABASE_URL = "postgres://worldcup:worldcup@localhost:55432/worldcup"
pnpm run db:migrate
pnpm run build
$env:PORT = "3000"
pnpm run start
```
