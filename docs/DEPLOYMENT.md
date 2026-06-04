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
pnpm run start
```

The app listens on `PORT`, which Railway provides.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Railway provides | Server port. |
| `RESULTS_PROVIDER` | No | `mock` by default, or `api-football`. |
| `ADMIN_PASSWORD` | Yes for `/admin` | Password for HTTP Basic authentication on `/admin`. |
| `API_FOOTBALL_KEY` | Only for API-FOOTBALL | API-FOOTBALL key. Store as a Railway secret, never in git. |
| `API_FOOTBALL_BASE_URL` | No | Defaults to `https://v3.football.api-sports.io`. |

## Deploy Flow

1. Push to GitHub.
2. Connect the repository in Railway.
3. Set `ADMIN_PASSWORD`.
4. Set `RESULTS_PROVIDER=api-football` and `API_FOOTBALL_KEY` if live data is required.
5. Railway builds with Nixpacks and starts `pnpm run start`.

## Verification Before Deploy

```powershell
pnpm run verify
```

## Rollback

Use Railway's deployment history to roll back to the previous successful deployment.

## Local verification before deploy

No deployment-specific local checks exist beyond `pnpm run verify`.
