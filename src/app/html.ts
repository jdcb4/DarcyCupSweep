import type { Nation } from '../data/nations.js';
import { nations as allNations } from '../data/nations.js';
import type { Sweep } from '../domain/sweep.js';
import { configuredTeamsCount, expectedTeamsCount, prizePoolUsd } from '../domain/sweep.js';
import { tournamentSchedule } from '../config/tournament.js';

export interface DashboardRenderOptions {
  apiPath?: string;
  notice?: string;
  demoLinks?: boolean;
}

export function renderDashboard(sweep: Sweep, options: DashboardRenderOptions = {}): string {
  const isActive = sweep.status === 'active';
  const phaseLabel = isActive ? 'Sweep active' : 'Pre-sweep';
  const phaseCopy = isActive
    ? 'Teams are allocated and prize tracking is live.'
    : 'Participants are listed before the draw. Team allocations will appear here once the sweep is confirmed active.';
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
    <title>World Cup Sweep Tracker</title>
    <link rel="stylesheet" href="/assets/styles.css" />
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
          <h1 id="page-title">Sweep tracker</h1>
          <p class="summary">16 players, 48 teams, and a $${prizePoolUsd(sweep)} prize pool tracked against group winners, runner-up, and champion results.</p>
          <div class="phase-pill" data-sweep-status="${sweep.status}">
            <strong>${phaseLabel}</strong>
            <span>${phaseCopy}</span>
          </div>
        </div>
        <img src="/assets/world-cup-dashboard.png" width="480" height="270" alt="" />
      </section>

      <section class="countdown-grid" aria-label="Important countdowns">
        ${renderCountdownCard(tournamentSchedule.sweepDraw.label, tournamentSchedule.sweepDraw.iso, tournamentSchedule.sweepDraw.display)}
        ${renderCountdownCard(tournamentSchedule.worldCupKickoff.label, tournamentSchedule.worldCupKickoff.iso, tournamentSchedule.worldCupKickoff.display)}
      </section>

      <section class="metrics" aria-label="Sweep summary">
        <article>
          <span>Buy-in</span>
          <strong>$${sweep.buyInUsd}</strong>
        </article>
        <article>
          <span>Prize pool</span>
          <strong>$${prizePoolUsd(sweep)}</strong>
        </article>
        <article>
          <span>Teams assigned</span>
          <strong>${configuredTeamsCount(sweep)}/${expectedTeamsCount(sweep)}</strong>
        </article>
        <article>
          <span>Live provider</span>
          <strong id="provider-label">Loading</strong>
        </article>
      </section>

      <section class="content-grid">
        <div class="panel">
          <div class="section-heading">
            <div>
              <p class="eyebrow">${isActive ? 'Leaderboard' : 'Pre-allocation'}</p>
              <h2>Participants</h2>
            </div>
            <p id="last-updated">Awaiting results snapshot</p>
          </div>
          <div id="contender-list" class="contender-list" aria-label="Participant contender status">
            <p class="empty-copy">Loading participant status.</p>
          </div>
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
        </div>

        <aside class="panel side-panel" aria-labelledby="prizes-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Payouts</p>
              <h2 id="prizes-title">Prize rules</h2>
            </div>
          </div>
          <dl class="prize-list">
            <div><dt>Champion</dt><dd>$${sweep.prizesUsd.champion}</dd></div>
            <div><dt>Runner-up</dt><dd>$${sweep.prizesUsd.runnerUp}</dd></div>
            <div><dt>Each group winner</dt><dd>$${sweep.prizesUsd.groupWinner}</dd></div>
          </dl>
          <div class="status-box" id="provider-status">Loading latest World Cup snapshot.</div>
          <div class="match-countdowns">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">Fixtures</p>
                <h2>Next 4 matches</h2>
              </div>
            </div>
            <div id="match-countdowns-list" class="match-list">
              <p class="empty-copy">Loading match countdowns.</p>
            </div>
          </div>
          <div class="recent-results">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">Results</p>
                <h2>Latest winners</h2>
              </div>
            </div>
            <div id="recent-results-list" class="match-list">
              <p class="empty-copy">Loading recent results.</p>
            </div>
          </div>
          <div class="nation-statuses">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">Nations</p>
                <h2>Cup status</h2>
              </div>
            </div>
            <div id="nation-status-list" class="nation-status-list">
              ${allNations.map((nation) => `<span class="status-chip" data-nation-status="${escapeHtml(nation.name)}">${nation.flag} ${escapeHtml(nation.name)}</span>`).join('')}
            </div>
          </div>
        </aside>
      </section>
    </main>
    <script src="/assets/app.js" type="module"></script>
  </body>
</html>`;
}

export function renderMatchesPage(apiPath = '/api/sweep'): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Upcoming Matches | World Cup Sweep Tracker</title>
    <link rel="stylesheet" href="/assets/styles.css" />
  </head>
  <body>
    <main class="app-shell schedule-shell" data-api-path="${escapeHtml(apiPath)}">
      ${renderSiteNav('matches')}
      <section class="panel schedule-panel" aria-labelledby="matches-title">
        <div class="section-heading schedule-heading">
          <div>
            <p class="eyebrow">Fixtures</p>
            <h1 id="matches-title">Upcoming matches</h1>
            <p class="schedule-intro">Kickoff times are shown in Australian Eastern time and update from the configured World Cup data provider.</p>
          </div>
          <div class="schedule-meta">
            <span id="schedule-provider">Loading provider</span>
            <span id="schedule-updated">Awaiting snapshot</span>
          </div>
        </div>
        <div id="all-upcoming-matches" class="schedule-list">
          <p class="empty-copy">Loading upcoming matches.</p>
        </div>
      </section>
    </main>
    <script src="/assets/matches.js" type="module"></script>
  </body>
</html>`;
}

export interface AdminRenderOptions {
  message?: string;
  errors?: string[];
}

export function renderAdminPage(sweep: Sweep, nations: Nation[], options: AdminRenderOptions = {}): string {
  const assignedTeams = new Set(sweep.participants.flatMap((participant) => participant.teams));
  const availableNations = nations.filter((nation) => !assignedTeams.has(nation.name));
  const availableChips = availableNations.map((nation) => renderNationChip(nation)).join('');
  const rows = sweep.participants
    .map(
      (participant, index) => `
        <section class="admin-participant" data-participant-index="${index}">
          <div class="admin-participant-heading">
            ${renderParticipantName(participant.name, index)}
            <span>${participant.teams.length}/${sweep.teamsPerParticipant}</span>
          </div>
          <div class="team-dropzone" data-team-dropzone="${index}" aria-label="${escapeHtml(participant.name)} teams">
            ${participant.teams
              .map((team) => {
                const nation = nations.find((candidate) => candidate.name === team);
                return nation ? renderNationChip(nation) : `<span class="nation-chip unknown" draggable="true" data-team="${escapeHtml(team)}">${escapeHtml(team)}</span>`;
              })
              .join('')}
          </div>
          <input type="hidden" name="teams-${index}" value="${escapeHtml(participant.teams.join('\n'))}" />
        </section>`
    )
    .join('');

  const errors = options.errors?.length
    ? `<div class="admin-alert error"><strong>Could not save active sweep</strong><ul>${options.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>`
    : '';
  const message = options.message ? `<div class="admin-alert success">${escapeHtml(options.message)}</div>` : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Admin | World Cup Sweep Tracker</title>
    <link rel="stylesheet" href="/assets/styles.css" />
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
    <script src="/assets/admin.js" type="module"></script>
  </body>
</html>`;
}

function renderCountdownCard(label: string, iso: string, display: string): string {
  return `<article class="countdown-card">
    <span>${escapeHtml(label)}</span>
    <strong data-countdown-target="${escapeHtml(iso)}">Calculating</strong>
    <time datetime="${escapeHtml(iso)}">${escapeHtml(display)}</time>
  </article>`;
}

function renderSiteNav(active: 'dashboard' | 'matches'): string {
  return `<nav class="site-nav" aria-label="Primary navigation">
    <a href="/" ${active === 'dashboard' ? 'aria-current="page"' : ''}>Dashboard</a>
    <a href="/matches" ${active === 'matches' ? 'aria-current="page"' : ''}>All matches</a>
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
  return `<button class="nation-chip" type="button" draggable="true" data-team="${escapeHtml(nation.name)}"><span aria-hidden="true">${nation.flag}</span><span>${escapeHtml(nation.name)}</span></button>`;
}

function renderTeamLabel(team: string): string {
  const nation = allNations.find((candidate) => candidate.name === team);
  return `${nation ? `<span aria-hidden="true">${nation.flag}</span> ` : ''}${escapeHtml(team)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
