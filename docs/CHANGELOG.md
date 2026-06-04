# Changelog

Notable changes by version. Newest entries go at the top.

## 0.2.2 - 2026-06-05

- Surface API-FOOTBALL response errors instead of treating error payloads as empty fixture data.

## 0.2.1 - 2026-06-05

- Added `.env` loading for local development and API-FOOTBALL credentials.

## 0.2.0 - 2026-06-05

- Added `/admin` with environment-password protection for assigning teams and activating the sweep.
- Added pre-sweep and active public phases.
- Added countdowns for the sweep draw, World Cup kickoff, and identified upcoming matches.
- Added activation validation for full, unique 48-team allocation.

## 0.1.0 - 2026-06-05

- Initialized the Hono/TypeScript app scaffold.
- Added local JSON sweep data for 16 participants.
- Added prize calculation domain logic and tests.
- Added mock and API-FOOTBALL World Cup provider scaffolding.
- Added Railway deployment config and GitHub verification workflow.
