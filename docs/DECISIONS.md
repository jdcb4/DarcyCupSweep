# Decisions

Durable architecture and tooling decisions. Use ADR-lite format: each entry is dated, names the decision, gives the reasoning, and records rejected alternatives.

## 2026-06-05: Initial project identity

**Decision:** Build World Cup Sweep Tracker for a 16-person 2026 Football World Cup sweep.

**Reasoning:** The user needs a website that tracks a fixed sweep format: 16 participants, three teams per participant, $100 buy-in, $800 champion prize, $200 runner-up prize, and $50 per group winner.

**Rejected alternatives:** A generic fantasy sports app was rejected because the current scope is a private sweep with no authentication request.

**Supersedes:** N/A

## 2026-06-05: Hono on Node.js

**Decision:** Use Hono with `@hono/node-server` and strict TypeScript.

**Reasoning:** The user explicitly requested Hono and Railway deployment via GitHub. Hono provides a small server footprint for the website and API endpoints.

**Rejected alternatives:** React/Vite-only static app was rejected because the app needs server-side provider calls and secret-backed API integration. Express was rejected because Hono was requested.

**Supersedes:** N/A

## 2026-06-05: pnpm and TypeScript tooling

**Decision:** Use pnpm, TypeScript, ESLint, Prettier, and Vitest.

**Reasoning:** These match the project defaults and provide deterministic verification through `pnpm run verify`.

**Rejected alternatives:** npm was rejected because the project defaults specify pnpm. Jest was rejected because Vitest is the default for this TypeScript scaffold.

**Supersedes:** N/A

## 2026-06-05: Local JSON persistence

**Decision:** Store sweep configuration in `src/data/sweep.json` and validate it with Zod.

**Reasoning:** The current data is small, mostly static, and can be edited in source control. A database would add deployment and security complexity without current product need.

**Rejected alternatives:** A database was rejected because JSON is sufficient for one sweep and the user did not ask for user-managed editing or authentication.

**Supersedes:** N/A

## 2026-06-05: API-FOOTBALL as primary live-results provider

**Decision:** Scaffold API-FOOTBALL as the primary near-real-time provider, with a mock provider as the default.

**Reasoning:** API-FOOTBALL documents 2026 World Cup support using `league=1` and `season=2026`, including fixtures, standings, and live fixture updates. It requires an API key, so the app defaults to mock mode until credentials are configured.

**Rejected alternatives:** football-data.org is a possible fallback for football competition data, but the currently reviewed quickstart examples centered on the 2022 World Cup and did not document the same 2026 live-update workflow. Unofficial public repositories were rejected as primary providers because freshness and reliability are unclear.

**Supersedes:** N/A

## 2026-06-05: Railway via GitHub

**Decision:** Deploy with Railway using Nixpacks and `pnpm run start`.

**Reasoning:** The user requested Railway via GitHub. The repo includes `railway.json` and a GitHub Actions verification workflow.

**Rejected alternatives:** Docker and other platforms were rejected because they were not requested and are unnecessary for this initial Node service.

**Supersedes:** N/A

## 2026-06-05: Environment-password admin

**Decision:** Protect `/admin` with HTTP Basic authentication using `ADMIN_PASSWORD`.

**Reasoning:** The user explicitly requested an admin page protected by an environment-variable-set password. HTTP Basic keeps the initial Hono implementation small and avoids adding user accounts or session storage.

**Rejected alternatives:** Full authentication was rejected because the user did not ask for accounts and the project rules prohibit adding auth silently. A public admin page was rejected because team allocation changes are privileged.

**Supersedes:** N/A

## 2026-06-05: JSON admin writes for sweep allocation

**Decision:** Let `/admin` write the team allocation and status to `src/data/sweep.json`.

**Reasoning:** The sweep data remains small and structured, and JSON is still sufficient for a first private sweep workflow.

**Rejected alternatives:** A database was rejected for this iteration because the feature can be represented in JSON. Railway filesystem writes are not durable across all platform lifecycle events, so durable hosted editing should be revisited before relying on live admin changes as the only source of truth.

**Supersedes:** N/A

## 2026-06-05: dotenv for local environment loading

**Decision:** Use `dotenv` so local `.env` values are loaded before environment validation.

**Reasoning:** The app already depends on environment variables for provider credentials and admin password, and the user added an API key to a local `.env` file. Loading `.env` in `src/config/env.ts` keeps local behavior aligned with Railway secrets without committing sensitive values.

**Rejected alternatives:** Requiring every local command to pass PowerShell environment variables was rejected because it is error-prone. Node's `--env-file` flag was rejected because it would need script-specific wiring for dev and production commands.

**Supersedes:** N/A

## 2026-06-05: OpenFootball schedule provider

**Decision:** Add `RESULTS_PROVIDER=openfootball` using the public-domain `openfootball/worldcup` Football.TXT files.

**Reasoning:** The user requested the OpenFootball option and still wants to keep API-FOOTBALL as a possible paid provider. OpenFootball provides open fixtures that are useful for match countdowns and schedule display without credentials.

**Rejected alternatives:** Replacing API-FOOTBALL was rejected because OpenFootball is not a near-real-time scoring source. Vendoring the dataset was rejected because reading the upstream raw files keeps fixtures current without committing generated data.

**Supersedes:** N/A

## 2026-06-05: Participant avatar sprite

**Decision:** Use one generated 4x4 raster sprite sheet for the 16 participant avatars.

**Reasoning:** A single project-local sprite keeps the UI fast and avoids 16 separate generated image files while still giving each participant a distinct avatar by position.

**Rejected alternatives:** External avatar services were rejected because they add a runtime dependency and privacy/loading risk. Hand-authored SVG placeholders were rejected because the user asked for generated avatars.

**Supersedes:** N/A

## 2026-06-05: Postgres-backed sweep state

**Decision:** Use Railway Postgres for durable sweep state when `DATABASE_URL` is set, while retaining the existing JSON file as a local fallback.

**Reasoning:** The user provisioned a Railway Postgres database and the admin page now edits the live allocation. Those writes must survive deploys and restarts, which Railway source-file writes cannot guarantee. The data is still one small document, so storing the validated sweep state in a JSONB `app_state` row keeps the persistence layer small.

**Rejected alternatives:** A persistent Railway volume was rejected because it would still tie state to filesystem operations and is less portable than a managed database. A fully relational schema was rejected for now because the current data shape is small and the app does not need participant/team history or multi-user querying.

**Supersedes:** 2026-06-05: Local JSON persistence; 2026-06-05: JSON admin writes for sweep allocation

## 2026-06-05: Drag/drop nation allocation

**Decision:** Show all 48 participating nations with flags on `/admin` and allow them to be dragged into each participant's three-team allocation.

**Reasoning:** The sweep draw workflow is easier to audit when every country is visible in one pool and assigned countries move out of that pool. Hidden inputs preserve normal form submission, so the admin workflow does not require a separate client API.

**Rejected alternatives:** Textarea-only entry was rejected because it is more error-prone with 48 teams. A custom SPA admin API was rejected because the current server-rendered form is sufficient.

**Supersedes:** N/A

## 2026-06-05: Derived tracking model

**Decision:** Derive participant tracking, nation status, upcoming match ownership, and recent winners in `src/domain/tracking.ts`.

**Reasoning:** The public UI needs consistent answers for teams left, next participant matches, the next four fixtures, match ownership, and eliminated countries. Keeping this derivation in domain code makes it testable and independent of the Hono/rendering layers.

**Rejected alternatives:** Computing tracking directly in browser JavaScript was rejected because it would duplicate tournament rules and be harder to test. Storing derived status in the database was rejected because provider snapshots can change and the values are cheap to recompute.

**Supersedes:** N/A

## 2026-06-12: football-data.org as default World Cup provider

**Decision:** Add `RESULTS_PROVIDER=football-data` backed by football-data.org and make it the default provider.

**Reasoning:** The user has provisioned `FOOTBALL_DATA_KEY` locally and in Railway, and football-data.org lists Worldcup in its free tier. Its match API supports live-ish match statuses and single-match refreshes, which should provide fresher data than the OpenFootball text files while avoiding API-FOOTBALL paid access for now.

**Rejected alternatives:** Keeping OpenFootball as the default was rejected because it updates post-game and may lag. Replacing API-FOOTBALL entirely was rejected because it remains a possible paid near-real-time provider.

**Supersedes:** 2026-06-05: API-FOOTBALL as primary live-results provider
