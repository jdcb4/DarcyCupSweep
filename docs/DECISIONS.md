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
