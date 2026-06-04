import type { Sweep } from '../domain/sweep.js';
import { configuredTeamsCount, expectedTeamsCount, prizePoolUsd } from '../domain/sweep.js';
import { tournamentSchedule } from '../config/tournament.js';

export function renderDashboard(sweep: Sweep): string {
  const isActive = sweep.status === 'active';
  const phaseLabel = isActive ? 'Sweep active' : 'Pre-sweep';
  const phaseCopy = isActive
    ? 'Teams are allocated and prize tracking is live.'
    : 'Participants are listed before the draw. Team allocations will appear here once the sweep is confirmed active.';
  const participantRows = sweep.participants
    .map(
      (participant) => `
        <tr>
          <th scope="row">${escapeHtml(participant.name)}</th>
          <td>${participant.teams.length}/${sweep.teamsPerParticipant}</td>
          <td>${renderTeamList(participant.teams)}</td>
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
    <main class="app-shell">
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
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Participant</th>
                  <th scope="col">Teams</th>
                  <th scope="col">Allocation</th>
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
                <h2>Next matches</h2>
              </div>
            </div>
            <div id="match-countdowns-list" class="match-list">
              <p class="empty-copy">Loading match countdowns.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
    <script src="/assets/app.js" type="module"></script>
  </body>
</html>`;
}

export interface AdminRenderOptions {
  message?: string;
  errors?: string[];
}

export function renderAdminPage(sweep: Sweep, options: AdminRenderOptions = {}): string {
  const rows = sweep.participants
    .map(
      (participant, index) => `
        <label class="admin-participant">
          <span>${escapeHtml(participant.name)}</span>
          <textarea name="teams-${index}" rows="3" spellcheck="false" aria-label="${escapeHtml(participant.name)} teams">${escapeHtml(participant.teams.join('\n'))}</textarea>
        </label>`
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
        <p class="admin-intro">Enter one team per line for each participant. The sweep can only be activated when all 16 participants have exactly ${sweep.teamsPerParticipant} unique teams.</p>
        ${message}
        ${errors}
        <form method="post" action="/admin" class="admin-form">
          <div class="admin-grid">${rows}</div>
          <label class="activation-check">
            <input type="checkbox" name="status" value="active" ${sweep.status === 'active' ? 'checked' : ''} />
            <span>Confirm sweep is active</span>
          </label>
          <button type="submit">Save sweep</button>
        </form>
      </section>
    </main>
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

function renderTeamList(teams: string[]): string {
  if (teams.length === 0) {
    return '<span class="empty-state">Unassigned</span>';
  }

  return `<ul class="team-list">${teams.map((team) => `<li>${escapeHtml(team)}</li>`).join('')}</ul>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
