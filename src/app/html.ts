import type { Nation } from '../data/nations.js';
import { nations as allNations } from '../data/nations.js';
import { tournamentSchedule } from '../config/tournament.js';
import type { Sweep } from '../domain/sweep.js';
import { prizePoolUsd } from '../domain/sweep.js';

const assetVersion = '0.11.0';

export interface DashboardRenderOptions {
  apiPath?: string;
  notice?: string;
  demoLinks?: boolean;
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
  const participantRows = sweep.participants
    .map(
      (participant, index) => `
        <tr>
          <th scope="row">${renderParticipantName(participant.name, index)}</th>
          <td data-teams-left-for="${escapeHtml(participant.name)}">${participant.teams.length}/${sweep.teamsPerParticipant}</td>
          <td>${renderTeamList(participant.teams)}</td>
          <td data-next-match-for="${escapeHtml(participant.name)}"><span class="empty-state">Awaiting fixtures</span></td>
          <td data-run-for="${escapeHtml(participant.name)}"><span class="empty-state">Awaiting draw</span></td>
          <td data-prize-for="${escapeHtml(participant.name)}">${isActive ? '$0' : '<span class="empty-state">Pending draw</span>'}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090f0d" />
    <title>World Cup Sweep Tracker</title>
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

      ${isActive ? '' : renderDrawCountdown()}

      <section class="spotlight-grid" aria-label="Sweep highlights">
        <article class="spotlight-card">
          <span>Prize leader</span>
          <strong id="spotlight-leader">Draw pending</strong>
          <small id="spotlight-leader-detail">$${prizePoolUsd(sweep)} pool waiting for results</small>
        </article>
        <article class="spotlight-card">
          <span>Next match</span>
          <strong id="spotlight-next-match">Fixture preview</strong>
          <small id="spotlight-next-detail">Sweep matchups appear here once fixtures are loaded</small>
        </article>
        <article class="spotlight-card">
          <span>Latest result</span>
          <strong id="spotlight-last-result">Results pending</strong>
          <small id="spotlight-last-detail">Recent winners appear here after matches finish</small>
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
            <details class="detail-table-panel">
              <summary>Detailed tracking table</summary>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Participant</th>
                      <th scope="col">Left</th>
                      <th scope="col">Allocation</th>
                      <th scope="col">Next match</th>
                      <th scope="col">Run</th>
                      <th scope="col">Prizes</th>
                    </tr>
                  </thead>
                  <tbody>${participantRows}</tbody>
                </table>
              </div>
            </details>
          </div>
        </details>

        <aside class="side-stack" aria-label="Matches and nations">
          <details class="panel collapsible-panel match-countdowns-panel" open>
            <summary>
              <div>
                <p class="eyebrow">Fixtures</p>
                <h2>Next 4 matches</h2>
              </div>
            </summary>
            <div class="collapsible-body">
              <div id="match-countdowns-list" class="match-list">
                <p class="empty-copy">Loading fixture preview.</p>
              </div>
            </div>
          </details>
          <details class="panel collapsible-panel recent-results-panel" open>
            <summary>
              <div>
                <p class="eyebrow">Results</p>
                <h2>Latest winners</h2>
              </div>
            </summary>
            <div class="collapsible-body">
              <div id="recent-results-list" class="match-list">
                <p class="empty-copy">Results will appear after completed matches.</p>
              </div>
            </div>
          </details>
          <details class="panel collapsible-panel nation-statuses-panel">
            <summary>
              <div>
                <p class="eyebrow">Nations</p>
                <h2>Cup status</h2>
              </div>
              <p id="nation-status-summary" class="panel-summary-note">48 nations</p>
            </summary>
            <div class="collapsible-body">
              <div id="nation-status-list" class="nation-status-list">
                ${allNations.map((nation) => renderStatusChip(nation)).join('')}
              </div>
            </div>
          </details>
        </aside>
      </section>
    </main>
    <script src="${assetPath('/assets/app.js')}" type="module"></script>
  </body>
</html>`;
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

export function renderMatchesPage(apiPath = '/api/sweep'): string {
  return renderSchedulePage({
    active: 'upcoming',
    apiPath,
    title: 'All Upcoming Matches | World Cup Sweep Tracker',
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
    title: 'All Finalised Matches | World Cup Sweep Tracker',
    eyebrow: 'Results',
    heading: 'All finalised matches',
    intro:
      'Completed matches are shown newest first with final scores, Australian Eastern kickoff times, and sweep ownership.',
    listId: 'all-finalised-matches',
    loadingCopy: 'Loading finalised matches.',
    scriptMode: 'finalised'
  });
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
    <title>Admin | World Cup Sweep Tracker</title>
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

function renderSiteNav(active: 'dashboard' | 'upcoming' | 'finalised'): string {
  return `<nav class="site-nav" aria-label="Primary navigation">
    <a href="/" ${active === 'dashboard' ? 'aria-current="page"' : ''}>Dashboard</a>
    <a href="/matches" ${active === 'upcoming' ? 'aria-current="page"' : ''}>All upcoming matches</a>
    <a href="/finalised-matches" ${active === 'finalised' ? 'aria-current="page"' : ''}>All finalised matches</a>
  </nav>`;
}

function renderTeamList(teams: string[]): string {
  if (teams.length === 0) {
    return '<span class="empty-state">Unassigned</span>';
  }

  return `<ul class="team-list">${teams.map((team) => `<li>${renderTeamLabel(team)}</li>`).join('')}</ul>`;
}

function renderParticipantName(name: string, index: number): string {
  return `<span class="participant-name"><span class="participant-avatar avatar-${index}" aria-hidden="true"></span><span>${escapeHtml(name)}</span></span>`;
}

function renderNationChip(nation: Nation): string {
  return `<button class="nation-chip country-card" type="button" draggable="true" data-team="${escapeHtml(nation.name)}">${renderFlagImage(nation)}<span><strong>${escapeHtml(nation.name)}</strong><small>${escapeHtml(nation.code)}</small></span></button>`;
}

function renderTeamLabel(team: string): string {
  const nation = allNations.find((candidate) => candidate.name === team);
  return nation
    ? `${renderFlagImage(nation)}<span><strong>${escapeHtml(team)}</strong><small>${escapeHtml(nation.code)}</small></span>`
    : `<span><strong>${escapeHtml(team)}</strong></span>`;
}

function renderStatusChip(nation: Nation): string {
  return `<span class="status-chip country-card" data-nation-status="${escapeHtml(nation.name)}">${renderFlagImage(nation)}<span><strong>${escapeHtml(nation.name)}</strong><small>${escapeHtml(nation.code)}</small></span></span>`;
}

function renderFlagImage(nation: Nation): string {
  return `<img class="flag-img" src="${escapeHtml(nation.flagImageUrl)}" width="40" height="30" alt="${escapeHtml(`${nation.name} flag`)}" loading="lazy" />`;
}

function assetPath(path: string): string {
  return `${path}?v=${assetVersion}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
