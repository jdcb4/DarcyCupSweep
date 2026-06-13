# Changelog

Notable changes by version. Newest entries go at the top.

## 0.10.1 - 2026-06-13

- Added versioned static asset URLs so browsers and CDN caches fetch the current schedule script after deploys.

## 0.10.0 - 2026-06-13

- Renamed the public schedule page to "All upcoming matches" and updated navigation to match.
- Added `/finalised-matches`, a matching schedule-style page for all completed matches with scores and sweep ownership.
- Added full finalised-match tracking data while keeping the dashboard's recent results limited to the latest four.

## 0.9.4 - 2026-06-13

- Increased football-data.org polling to ten-minute full refreshes, with one-minute match-specific refreshes from 85 to 110 minutes after kickoff.
- Recalculate football-data.org group standings after match-specific refreshes so result-window polls update derived sweep state immediately.

## 0.9.3 - 2026-06-12

- Fixed group-winner prize calculation so `$50` group prizes are only awarded after the relevant group is complete.

## 0.9.2 - 2026-06-12

- Added a protected `/admin/refresh-results` action for manually refreshing the cached World Cup provider snapshot.
- Added an admin panel control to trigger the provider refresh without changing sweep allocations.

## 0.9.1 - 2026-06-12

- Canonicalized football-data.org team names using team codes so provider names like `United States`, `Congo DR`, and `Curaçao` match app allocations.
- Derived football-data.org group standings from finished group matches and local group metadata because the API returns a single combined World Cup standings table.

## 0.9.0 - 2026-06-12

- Added `RESULTS_PROVIDER=football-data` using football-data.org World Cup matches, standings, and match-specific refreshes.
- Made football-data.org the default results provider via `FOOTBALL_DATA_KEY`.
- Documented football-data.org local and Railway configuration while retaining mock, OpenFootball, and API-FOOTBALL provider options.

## 0.8.5 - 2026-06-11

- Added a dark Darcy Cup favicon with trophy and football styling across dashboard, matches, and admin pages.

## 0.8.4 - 2026-06-10

- Made team ownership matching accent-insensitive so provider names like `Curaçao` match stored allocations like `Curacao` without changing existing saved sweep data.

## 0.8.3 - 2026-06-05

- Restored the pre-sweep draw countdown as the lead dashboard item until the sweep is activated.
- Used the canonical 8:00 PM AEST, Thursday 11 June 2026 draw time from tournament configuration.

## 0.8.2 - 2026-06-05

- Fixed the admin allocation page so participant names remain visible after drag/drop form sync.
- Styled the admin team count as a distinct badge beside each participant name.

## 0.8.1 - 2026-06-05

- Reworked the pre-sweep dashboard to show a compact participant roster and a single example allocation preview instead of repeated placeholder team cards.
- Improved first-load placeholders so the server-rendered page shows useful pending states before the API snapshot loads.
- Collapsed the full cup status list by default and added an active/eliminated nation summary.
- Moved the detailed participant table behind a disclosure control to keep the primary dashboard focused on highlights, matches, and roster status.
- Tightened match card, country card, header, and mobile styling for a cleaner dark UI.

## 0.8.0 - 2026-06-05

- Split next matches, latest results, and cup status into separate collapsible panels.
- Added preview placeholders for empty match, result, prize leader, and pre-draw participant states.
- Shrunk the dashboard header and moved the hero image into a subdued background treatment.
- Reworked nation status cards into flag-led rectangles with eliminated-state fading.

## 0.7.0 - 2026-06-05

- Added server-side World Cup data polling with cached snapshots for public API routes.
- Set OpenFootball polling to hourly, or every five minutes during the hour after nominal match end.
- Set API-Football polling to hourly full refreshes, or ten-minute match-specific refreshes around match windows.

## 0.6.0 - 2026-06-05

- Switched the public UI to a darker visual theme.
- Removed public provider status cards and team allocation count cards from the participant-facing dashboard.
- Added frontloaded highlight cards for prize leader, next match, and latest result.
- Replaced emoji flag displays with image-backed country cards across dashboard, schedule, and admin allocation UI.
- Reordered mobile dashboard content so match and result information appears before the detailed participant table.

## 0.5.0 - 2026-06-05

- Added `/matches`, a navigable page showing all upcoming World Cup matches.
- Grouped match fixtures by Australian Eastern date and displayed kickoff times using the `Australia/Sydney` timezone.
- Exposed all upcoming provider-backed matches through the tracking API while keeping the dashboard limited to the next four.

## 0.4.2 - 2026-06-05

- Redesigned upcoming and recent match cards with structured team rows, owner pills, score/countdown markers, and matchup summaries.
- Added participant contender cards and run summaries so users can scan who still has teams alive and how far each participant has reached.
- Added a Run column to the participant table and improved mobile behavior for the contender strip.

## 0.4.1 - 2026-06-05

- Added local demo pages for allocated teams with no results and allocated teams with the first dozen completed results.
- Added fixed demo API snapshots so preview states do not overwrite live admin/Postgres sweep data.

## 0.4.0 - 2026-06-05

- Added Postgres persistence behind `DATABASE_URL`, with JSON fallback for local development.
- Added a local Docker Compose Postgres service and database migration script.
- Updated Railway to run database migration before app start.
- Rebuilt `/admin` around drag/drop assignment from all 48 participating nations.
- Added flags for all participating nations.
- Added participant tracking for teams left and next match.
- Added next four upcoming matches, recent winners, per-team sweep participant ownership, and active/eliminated nation status.

## 0.3.0 - 2026-06-05

- Added `RESULTS_PROVIDER=openfootball` for public-domain OpenFootball World Cup schedule fixtures.
- Added OpenFootball post-game score and winner parsing.
- Kept API-FOOTBALL as the paid near-real-time provider option.
- Added generated participant animal avatars through a local sprite sheet.

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
