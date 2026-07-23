import type { Nation } from '../data/nations.js';
import { nations as allNations } from '../data/nations.js';
import {
  archivedSweeps,
  type ArchivedEntryOutcome,
  type ArchivedParticipantOutcome,
  type ArchivedSweepOutcome
} from '../data/sweepArchives.js';
import {
  appSweepMode,
  getCompletedSweeps,
  getNextSweep,
  getPlannedSweeps,
  type SweepEvent
} from '../data/sweepEvents.js';
import { tournamentSchedule } from '../config/tournament.js';
import type { Sweep } from '../domain/sweep.js';
import { prizePoolUsd } from '../domain/sweep.js';

const assetVersion = '0.14.0';

export interface DashboardRenderOptions {
  apiPath?: string;
  notice?: string;
  demoLinks?: boolean;
}

export function renderLandingPage(): string {
  const nextSweep = getNextSweep();
  const planned = getPlannedSweeps();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>Darcy Cup Sweep Tracker</title>
    <link rel="icon" href="${assetPath('/assets/favicon.svg')}" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPath('/assets/styles.css')}" />
  </head>
  <body>
    <main class="app-shell landing-shell">
      ${renderSiteNav('dashboard', { includeCurrentMatches: false })}
      <section class="landing-hero" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">Darcy Cup</p>
          <h1 id="page-title">Sweep HQ</h1>
          <p class="summary">Between sweeps. Past results are archived and the next draw will appear here.</p>
        </div>
        <span class="mode-pill">${formatSweepMode(appSweepMode)}</span>
      </section>
      ${renderNextSweepBanner(nextSweep)}
      <section class="landing-grid" aria-label="Sweep overview">
        <section class="panel landing-panel" aria-labelledby="planned-title">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Upcoming</p>
              <h2 id="planned-title">Planned sweeps</h2>
            </div>
          </div>
          <div class="sweep-card-list compact">
            ${planned.map((event) => renderPlannedSweepCard(event)).join('')}
          </div>
        </section>
        <section class="panel landing-panel" aria-labelledby="previous-title">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Archive</p>
              <h2 id="previous-title">Previous sweeps</h2>
            </div>
          </div>
          <div class="sweep-card-list">
            ${archivedSweeps.map((archive) => renderArchiveSummaryCard(archive)).join('')}
          </div>
        </section>
      </section>
    </main>
    <script src="${assetPath('/assets/landing.js')}" type="module"></script>
  </body>
</html>`;
}

export function renderDashboard(
  sweep: Sweep,
  options: DashboardRenderOptions = {}
): string {
  const isActive = sweep.status === 'active';
  const phaseLabel = isActive ? 'Sweep active' : 'Pre-sweep';
  const phaseCopy = isActive
    ? 'Teams allocated. Prize tracking is live.'
    : 'Draw pending. Teams appear after allocation.';
  const nextSweep = getNextSweep();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>Darcy Cup Sweep Tracker</title>
    <link rel="icon" href="${assetPath('/assets/favicon.svg')}" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPath('/assets/styles.css')}" />
  </head>
  <body>
    <main class="app-shell" data-api-path="${escapeHtml(options.apiPath ?? '/api/sweep')}">
      ${
        options.notice
          ? `<nav class="demo-switcher" aria-label="Demo scenarios">
              <strong>${escapeHtml(options.notice)}</strong>
              ${
                options.demoLinks
                  ? `<span><a href="/demo/allocated">Allocated, no results</a><a href="/demo/results">First dozen results</a><a href="/">Live app</a></span>`
                  : ''
              }
            </nav>`
          : ''
      }
      ${renderSiteNav('dashboard')}
      <section class="dashboard-header" aria-labelledby="page-title">
        <div class="header-copy">
          <p class="eyebrow">2026 Football World Cup Sweep</p>
          <h1 id="page-title">Darcy Cup</h1>
          <p class="summary">Fixtures, results, and sweep standings.</p>
          <div class="phase-pill" data-sweep-status="${sweep.status}">
            <strong>${phaseLabel}</strong>
            <span>${phaseCopy}</span>
          </div>
        </div>
      </section>

      ${renderNextSweepBanner(nextSweep)}
      ${isActive ? '' : renderDrawCountdown()}

      <section id="live-match-panel" class="panel live-match-panel" aria-live="polite" hidden>
        <div class="section-heading compact">
          <div>
            <p id="live-match-label" class="eyebrow">Live match</p>
            <h2 id="live-match-heading">On now</h2>
          </div>
          <p id="live-match-summary" class="panel-summary-note">Live</p>
        </div>
        <div id="live-match-card" class="match-list"></div>
      </section>

      <section class="spotlight-grid" aria-label="Sweep highlights">
        <article class="spotlight-card">
          <span>Prize leader</span>
          <strong id="spotlight-leader">Draw pending</strong>
          <small id="spotlight-leader-detail">$${prizePoolUsd(sweep)} pool waiting for results</small>
        </article>
      </section>

      <section class="content-grid">
        <details class="panel collapsible-panel participant-panel" open>
          <summary>
            <div>
              <p class="eyebrow">${isActive ? 'Leaderboard' : 'Pre-allocation'}</p>
              <h2>Participants</h2>
            </div>
            <p id="last-updated">Awaiting snapshot</p>
          </summary>
          <div class="collapsible-body">
            <div id="contender-list" class="contender-list" aria-label="Participant contender status">
              <p class="empty-copy">Preparing participant roster.</p>
            </div>
          </div>
        </details>

        <aside class="side-stack" aria-label="Matches">
          <details class="panel collapsible-panel match-countdowns-panel" open>
            <summary>
              <div>
                <p class="eyebrow">Fixtures</p>
                <h2 id="match-panel-heading">Next match</h2>
              </div>
            </summary>
            <div class="collapsible-body">
              <div id="match-countdowns-list" class="match-list">
                <p class="empty-copy">Loading fixture preview.</p>
              </div>
              <a class="panel-footer-link" href="/matches">All upcoming matches</a>
            </div>
          </details>
          <details class="panel collapsible-panel recent-results-panel" open>
            <summary>
              <div>
                <p class="eyebrow">Results</p>
                <h2>Most recent result</h2>
              </div>
            </summary>
            <div class="collapsible-body">
              <div id="recent-results-list" class="match-list">
                <p class="empty-copy">Results will appear after completed matches.</p>
              </div>
              <a class="panel-footer-link" href="/finalised-matches">All finalised matches</a>
            </div>
          </details>
        </aside>
      </section>
    </main>
    <script src="${assetPath('/assets/app.js')}" type="module"></script>
  </body>
</html>`;
}

function renderNextSweepBanner(event: SweepEvent | null): string {
  if (!event) {
    return `<section class="next-sweep-banner" aria-labelledby="next-sweep-title">
      <div>
        <p class="eyebrow">Next sweep</p>
        <h2 id="next-sweep-title">Yet to be announced</h2>
      </div>
      <strong>Stand by</strong>
    </section>`;
  }

  const countdown = event.startsAtIso
    ? `<strong data-countdown-target="${event.startsAtIso}">Calculating</strong>`
    : '<strong>Date TBA</strong>';

  return `<section class="next-sweep-banner" aria-labelledby="next-sweep-title">
    <div>
      <p class="eyebrow">Next sweep</p>
      <h2 id="next-sweep-title">${escapeHtml(event.name)}</h2>
      <p>${escapeHtml(event.displayDate)}</p>
    </div>
    <div class="next-sweep-clock">
      ${countdown}
      <span>${escapeHtml(event.sweepType)}</span>
    </div>
  </section>`;
}

function renderDrawCountdown(): string {
  const draw = tournamentSchedule.sweepDraw;

  return `<section class="draw-countdown" aria-labelledby="draw-countdown-title">
    <div class="draw-countdown-copy">
      <p class="eyebrow">Next milestone</p>
      <h2 id="draw-countdown-title">Sweep draw</h2>
      <p>Allocations unlock after the draw is finalised in admin.</p>
    </div>
    <div class="draw-countdown-clock">
      <strong data-countdown-target="${draw.iso}">Calculating</strong>
      <time datetime="${draw.iso}">${escapeHtml(draw.display)}</time>
    </div>
  </section>`;
}

export function renderSweepsPage(): string {
  const completed = getCompletedSweeps();
  const planned = getPlannedSweeps();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>Previous Sweeps | Darcy Cup</title>
    <link rel="icon" href="${assetPath('/assets/favicon.svg')}" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPath('/assets/styles.css')}" />
  </head>
  <body>
    <main class="app-shell sweeps-shell">
      ${renderSiteNav('sweeps', { includeCurrentMatches: false })}
      <section class="panel sweeps-panel" aria-labelledby="sweeps-title">
        <div class="section-heading schedule-heading">
          <div>
            <p class="eyebrow">Sweep history</p>
            <h1 id="sweeps-title">Previous sweeps</h1>
            <p class="schedule-intro">Past events stay browsable, with planned sweeps queued separately.</p>
          </div>
        </div>
        <div class="sweep-card-list">
          ${completed.map((event) => renderSweepHistoryCard(event)).join('')}
        </div>
      </section>
      <section class="panel sweeps-panel" aria-labelledby="planned-sweeps-title">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Next events</p>
            <h2 id="planned-sweeps-title">Planned sweeps</h2>
          </div>
        </div>
        <div class="sweep-card-list compact">
          ${planned.map((event) => renderPlannedSweepCard(event)).join('')}
        </div>
      </section>
    </main>
  </body>
</html>`;
}

export function renderArchivedSweepPage(archive: ArchivedSweepOutcome): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>${escapeHtml(archive.name)} Results | Darcy Cup</title>
    <link rel="icon" href="${assetPath('/assets/favicon.svg')}" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPath('/assets/styles.css')}" />
  </head>
  <body>
    <main class="app-shell archive-shell">
      ${renderSiteNav('sweeps', { includeCurrentMatches: false })}
      <section class="archive-hero" aria-labelledby="archive-title">
        <div>
          <p class="eyebrow">Archived outcome</p>
          <h1 id="archive-title">${escapeHtml(archive.name)}</h1>
          <p>${escapeHtml(archive.displayDate)} · ${escapeHtml(archive.sweepType)}</p>
        </div>
        <div class="archive-winner">
          <span>Winner</span>
          <strong>${escapeHtml(archive.winnerSummary)}</strong>
          <small>${formatUsd(archive.prizePoolUsd)} prize pool</small>
        </div>
      </section>
      <section class="panel archive-rules" aria-label="Prize rules">
        ${archive.prizeRules.map((rule) => `<span>${escapeHtml(rule)}</span>`).join('')}
      </section>
      <section class="archive-results" aria-label="Participant outcomes">
        ${archive.participants.map((participant, index) => renderArchiveParticipantCard(participant, index)).join('')}
      </section>
    </main>
  </body>
</html>`;
}

function renderSweepHistoryCard(event: SweepEvent): string {
  const archive = archivedSweeps.find((sweep) => sweep.slug === event.slug);
  const winnerCopy =
    archive?.winnerSummary ?? 'Winner available in full results';

  return `<a class="sweep-card" href="${escapeHtml(event.publicPath)}">
    <span>${escapeHtml(event.displayDate)}</span>
    <strong>${escapeHtml(event.name)}</strong>
    <small>${escapeHtml(winnerCopy)}</small>
  </a>`;
}

function renderArchiveSummaryCard(archive: ArchivedSweepOutcome): string {
  return `<a class="sweep-card" href="/sweeps/${escapeHtml(archive.slug)}">
    <span>${escapeHtml(archive.displayDate)}</span>
    <strong>${escapeHtml(archive.name)}</strong>
    <small>${escapeHtml(archive.winnerSummary)}</small>
  </a>`;
}

function renderArchiveParticipantCard(
  participant: ArchivedParticipantOutcome,
  index: number
): string {
  const rank = index + 1;

  return `<article class="archive-participant-card${rank === 1 ? ' is-winner' : ''}">
    <div class="archive-participant-heading">
      <span class="rank-badge">#${rank}</span>
      <strong>${escapeHtml(participant.participantName)}</strong>
      <span>${formatUsd(participant.totalPrizeUsd)}</span>
    </div>
    <div class="archive-entry-grid">
      ${participant.entries.map((entry) => renderArchiveEntry(entry)).join('')}
    </div>
  </article>`;
}

function renderArchiveEntry(entry: ArchivedEntryOutcome): string {
  const nation = allNations.find((candidate) => candidate.code === entry.code);
  const prizeCopy =
    entry.prizeUsd > 0
      ? `${formatUsd(entry.prizeUsd)} · ${entry.prizeReasons.join(', ')}`
      : 'No prize';

  return `<span class="archive-entry-card${entry.prizeUsd > 0 ? ' has-prize' : ''}">
    ${nation ? renderFlagImage(nation) : ''}
    <span>
      <strong>${escapeHtml(entry.name)}</strong>
      <small>${escapeHtml(entry.outcome)}</small>
      <small>${escapeHtml(prizeCopy)}</small>
    </span>
  </span>`;
}

function renderPlannedSweepCard(event: SweepEvent): string {
  return `<article class="sweep-card planned">
    <span>${escapeHtml(event.displayDate)}</span>
    <strong>${escapeHtml(event.name)}</strong>
    <small>${escapeHtml(event.sweepType)}</small>
  </article>`;
}

export function renderMatchesPage(apiPath = '/api/sweep'): string {
  return renderSchedulePage({
    active: 'upcoming',
    apiPath,
    title: 'All Upcoming Matches | Darcy Cup Sweep Tracker',
    eyebrow: 'Fixtures',
    heading: 'All upcoming matches',
    intro:
      'Kickoff times are shown in Australian Eastern time and update from the configured World Cup data provider.',
    listId: 'all-upcoming-matches',
    loadingCopy: 'Loading upcoming matches.',
    scriptMode: 'upcoming'
  });
}

export function renderFinalisedMatchesPage(apiPath = '/api/sweep'): string {
  return renderSchedulePage({
    active: 'finalised',
    apiPath,
    title: 'All Finalised Matches | Darcy Cup Sweep Tracker',
    eyebrow: 'Results',
    heading: 'All finalised matches',
    intro:
      'Completed matches are shown newest first with final scores, Australian Eastern kickoff times, and sweep ownership.',
    listId: 'all-finalised-matches',
    loadingCopy: 'Loading finalised matches.',
    scriptMode: 'finalised'
  });
}

export function renderNoCurrentMatchesPage(
  active: 'upcoming' | 'finalised'
): string {
  const isFinalised = active === 'finalised';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>${isFinalised ? 'Current Results' : 'Current Schedule'} | Darcy Cup Sweep Tracker</title>
    <link rel="icon" href="${assetPath('/assets/favicon.svg')}" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPath('/assets/styles.css')}" />
  </head>
  <body>
    <main class="app-shell schedule-shell">
      ${renderSiteNav(active)}
      <section class="panel schedule-panel empty-current-panel" aria-labelledby="matches-title">
        <div class="section-heading schedule-heading">
          <div>
            <p class="eyebrow">${isFinalised ? 'Results' : 'Fixtures'}</p>
            <h1 id="matches-title">${isFinalised ? 'No current sweep results' : 'No active sweep schedule'}</h1>
            <p class="schedule-intro">${isFinalised ? 'Finalised results will appear here once the next sweep is active.' : 'Upcoming matches will appear here once a sweep with scheduled fixtures is active.'}</p>
          </div>
        </div>
        <a class="panel-footer-link" href="/">Back to sweep HQ</a>
      </section>
    </main>
  </body>
</html>`;
}

interface SchedulePageOptions {
  active: 'upcoming' | 'finalised';
  apiPath: string;
  title: string;
  eyebrow: string;
  heading: string;
  intro: string;
  listId: string;
  loadingCopy: string;
  scriptMode: 'upcoming' | 'finalised';
}

function renderSchedulePage(options: SchedulePageOptions): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>${escapeHtml(options.title)}</title>
    <link rel="icon" href="${assetPath('/assets/favicon.svg')}" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPath('/assets/styles.css')}" />
  </head>
  <body>
    <main class="app-shell schedule-shell" data-api-path="${escapeHtml(options.apiPath)}" data-schedule-mode="${options.scriptMode}">
      ${renderSiteNav(options.active)}
      <section class="panel schedule-panel" aria-labelledby="matches-title">
        <div class="section-heading schedule-heading">
          <div>
            <p class="eyebrow">${escapeHtml(options.eyebrow)}</p>
            <h1 id="matches-title">${escapeHtml(options.heading)}</h1>
            <p class="schedule-intro">${escapeHtml(options.intro)}</p>
          </div>
          <div class="schedule-meta">
            <span id="schedule-updated">Awaiting snapshot</span>
          </div>
        </div>
        <div id="${escapeHtml(options.listId)}" class="schedule-list">
          <p class="empty-copy">${escapeHtml(options.loadingCopy)}</p>
        </div>
      </section>
    </main>
    <script src="${assetPath('/assets/matches.js')}" type="module"></script>
  </body>
</html>`;
}

export interface AdminRenderOptions {
  message?: string;
  errorTitle?: string;
  errors?: string[];
}

export function renderAdminPage(
  sweep: Sweep,
  nations: Nation[],
  options: AdminRenderOptions = {}
): string {
  const assignedTeams = new Set(
    sweep.participants.flatMap((participant) => participant.teams)
  );
  const availableNations = nations.filter(
    (nation) => !assignedTeams.has(nation.name)
  );
  const availableChips = availableNations
    .map((nation) => renderNationChip(nation))
    .join('');
  const rows = sweep.participants
    .map(
      (participant, index) => `
        <section class="admin-participant" data-participant-index="${index}">
          <div class="admin-participant-heading">
            ${renderParticipantName(participant.name, index)}
            <span class="admin-team-count">${participant.teams.length}/${sweep.teamsPerParticipant}</span>
          </div>
          <div class="team-dropzone" data-team-dropzone="${index}" aria-label="${escapeHtml(participant.name)} teams">
            ${participant.teams
              .map((team) => {
                const nation = nations.find(
                  (candidate) => candidate.name === team
                );
                return nation
                  ? renderNationChip(nation)
                  : `<span class="nation-chip unknown" draggable="true" data-team="${escapeHtml(team)}">${escapeHtml(team)}</span>`;
              })
              .join('')}
          </div>
          <input type="hidden" name="teams-${index}" value="${escapeHtml(participant.teams.join('\n'))}" />
        </section>`
    )
    .join('');

  const errors = options.errors?.length
    ? `<div class="admin-alert error"><strong>${escapeHtml(options.errorTitle ?? 'Could not save active sweep')}</strong><ul>${options.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>`
    : '';
  const message = options.message
    ? `<div class="admin-alert success">${escapeHtml(options.message)}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>Admin | Darcy Cup Sweep Tracker</title>
    <link rel="icon" href="${assetPath('/assets/favicon.svg')}" type="image/svg+xml" />
    <link rel="stylesheet" href="${assetPath('/assets/styles.css')}" />
  </head>
  <body>
    <main class="app-shell admin-shell">
      <section class="panel admin-panel" aria-labelledby="admin-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Admin</p>
            <h1 id="admin-title">Team allocation</h1>
          </div>
          <a class="text-link" href="/">Dashboard</a>
        </div>
        <p class="admin-intro">Assign three unique participating nations to each participant, then confirm the sweep is active.</p>
        ${message}
        ${errors}
        <section class="admin-action-panel" aria-labelledby="refresh-results-title">
          <div>
            <p class="eyebrow">Results data</p>
            <h2 id="refresh-results-title">Provider refresh</h2>
            <p>Force the server cache to fetch the latest World Cup snapshot from the configured provider.</p>
          </div>
          <form method="post" action="/admin/refresh-results" class="admin-action-form">
            <button type="submit">Refresh World Cup data</button>
          </form>
        </section>
        <form method="post" action="/admin" class="admin-form">
          <section class="nation-pool" aria-labelledby="nation-pool-title">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">Nations</p>
                <h2 id="nation-pool-title">Available countries</h2>
              </div>
              <span id="available-count">${availableNations.length}</span>
            </div>
            <div class="nation-pool-list" data-team-pool>${availableChips}</div>
          </section>
          <div class="admin-grid">${rows}</div>
          <label class="activation-check">
            <input type="checkbox" name="status" value="active" ${sweep.status === 'active' ? 'checked' : ''} />
            <span>Confirm sweep is active</span>
          </label>
          <button type="submit">Save sweep</button>
        </form>
      </section>
    </main>
    <script src="${assetPath('/assets/admin.js')}" type="module"></script>
  </body>
</html>`;
}

interface SiteNavOptions {
  includeCurrentMatches?: boolean;
}

function renderSiteNav(
  active: 'dashboard' | 'upcoming' | 'finalised' | 'sweeps',
  options: SiteNavOptions = {}
): string {
  const includeCurrentMatches = options.includeCurrentMatches ?? true;

  return `<nav class="site-nav" aria-label="Primary navigation">
    <a href="/" ${active === 'dashboard' ? 'aria-current="page"' : ''}>Dashboard</a>
    ${
      includeCurrentMatches
        ? `<a href="/matches" ${active === 'upcoming' ? 'aria-current="page"' : ''}>All upcoming matches</a>
    <a href="/finalised-matches" ${active === 'finalised' ? 'aria-current="page"' : ''}>All finalised matches</a>`
        : ''
    }
    <a href="/sweeps" ${active === 'sweeps' ? 'aria-current="page"' : ''}>Previous sweeps</a>
  </nav>`;
}

function renderParticipantName(name: string, index: number): string {
  return `<span class="participant-name"><span class="participant-avatar avatar-${index}" aria-hidden="true"></span><span>${escapeHtml(name)}</span></span>`;
}

function renderNationChip(nation: Nation): string {
  return `<button class="nation-chip country-card" type="button" draggable="true" data-team="${escapeHtml(nation.name)}">${renderFlagImage(nation)}<span><strong>${escapeHtml(nation.name)}</strong><small>${escapeHtml(nation.code)}</small></span></button>`;
}

function renderFlagImage(nation: Nation): string {
  return `<img class="flag-img" src="${escapeHtml(nation.flagImageUrl)}" width="40" height="30" alt="${escapeHtml(`${nation.name} flag`)}" loading="lazy" />`;
}

function formatSweepMode(mode: string): string {
  return mode.replaceAll('_', ' ');
}

function assetPath(path: string): string {
  return `${path}?v=${assetVersion}`;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
