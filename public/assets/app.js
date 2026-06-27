const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

async function refreshDashboard() {
  const shell = document.querySelector('[data-api-path]');
  const apiPath = shell?.dataset.apiPath ?? '/api/sweep';
  const lastUpdated = document.querySelector('#last-updated');
  const contenderList = document.querySelector('#contender-list');
  const matchList = document.querySelector('#match-countdowns-list');
  const recentResultsList = document.querySelector('#recent-results-list');
  const liveMatchPanel = document.querySelector('#live-match-panel');
  const liveMatchCard = document.querySelector('#live-match-card');

  try {
    const response = await fetch(apiPath);

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = await response.json();

    lastUpdated.textContent = `Updated ${new Date(payload.snapshot.updatedAt).toLocaleString()}`;
    renderLiveMatches(liveMatchPanel, liveMatchCard, findLiveMatches(payload));
    renderSpotlights(payload);
    renderMatches(matchList, getUpcomingMatchPool(payload));
    renderRecentResults(recentResultsList, payload.tracking.recentResults);
    renderContenders(contenderList, payload.tracking.participants);
    renderParticipantTracking(payload.tracking.participants);
    renderNationStatuses(payload.tracking.nations);
    scheduleDashboardRefresh(getRefreshDelay(payload));

    if (payload.sweep.status === 'active') {
      for (const standing of payload.leaderboard) {
        const prizeCell = document.querySelector(
          `[data-prize-for="${cssEscape(standing.participantName)}"]`
        );

        if (prizeCell) {
          prizeCell.textContent = formatter.format(standing.prizeUsd);
        }
      }
    }
  } catch (error) {
    lastUpdated.textContent = 'Snapshot failed';
    renderLiveMatches(liveMatchPanel, liveMatchCard, []);
    renderSpotlightError(error);
    renderContenders(contenderList, []);
    renderMatches(matchList, []);
    renderRecentResults(recentResultsList, []);
    scheduleDashboardRefresh(2 * 60 * 1000);
  }
}

function renderSpotlights(payload) {
  const leader = payload.leaderboard.find((standing) => standing.prizeUsd > 0);
  const nextMatch = getUpcomingMatchPool(payload).find(
    (match) => match.status !== 'live'
  );
  const latestResult = payload.tracking.recentResults[0];

  setSpotlight(
    'spotlight-leader',
    leader ? leader.participantName : 'Draw pending'
  );
  setSpotlight(
    'spotlight-leader-detail',
    leader
      ? `${formatter.format(leader.prizeUsd)} won so far`
      : `${formatter.format(payload.sweep.buyInUsd * payload.sweep.participants.length)} pool waiting for results`
  );

  setSpotlight('spotlight-next-label', 'Next match');
  setSpotlight(
    'spotlight-next-match',
    nextMatch ? matchTitle(nextMatch) : 'Fixture preview'
  );
  setSpotlight(
    'spotlight-next-detail',
    nextMatch
      ? `${liveMatchLabel(nextMatch)} - ${ownershipSummary(nextMatch)}`
      : 'Sweep matchups appear here once fixtures are loaded'
  );

  setSpotlight(
    'spotlight-last-result',
    latestResult
      ? `${latestResult.homeTeam} ${latestResult.homeGoals ?? '-'} - ${latestResult.awayGoals ?? '-'} ${latestResult.awayTeam}`
      : 'Results pending'
  );
  setSpotlight(
    'spotlight-last-detail',
    latestResult
      ? ownershipSummary(latestResult)
      : 'Recent winners appear here after matches finish'
  );
}

function renderSpotlightError(error) {
  const message =
    error instanceof Error
      ? error.message
      : 'Unable to load latest World Cup data.';
  setSpotlight('spotlight-leader', 'Unavailable');
  setSpotlight('spotlight-leader-detail', message);
  setSpotlight('spotlight-next-label', 'Next match');
  setSpotlight('spotlight-next-match', 'Unavailable');
  setSpotlight('spotlight-next-detail', 'Check the data provider.');
  setSpotlight('spotlight-last-result', 'Unavailable');
  setSpotlight('spotlight-last-detail', 'Check the data provider.');
}

function setSpotlight(id, text) {
  const element = document.querySelector(`#${id}`);

  if (element) {
    element.textContent = text;
  }
}

function renderMatches(container, matches) {
  if (!container) {
    return;
  }

  const visibleMatches = matches
    .filter((match) => match.status !== 'finished' && match.status !== 'live')
    .sort(
      (left, right) =>
        new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime()
    )
    .slice(0, 4);

  container.replaceChildren();

  if (visibleMatches.length === 0) {
    container.append(renderPreviewMatchCard('upcoming'));
    return;
  }

  for (const match of visibleMatches) {
    container.append(renderMatchCard(match, 'upcoming'));
  }

  updateCountdowns();
}

function renderRecentResults(container, matches) {
  if (!container) {
    return;
  }

  const visibleMatches = matches
    .filter((match) => match.status === 'finished')
    .sort(
      (left, right) =>
        new Date(right.utcDate).getTime() - new Date(left.utcDate).getTime()
    )
    .slice(0, 4);

  container.replaceChildren();

  if (visibleMatches.length === 0) {
    container.append(renderPreviewMatchCard('result'));
    return;
  }

  for (const match of visibleMatches) {
    container.append(renderMatchCard(match, 'result'));
  }
}

function getUpcomingMatchPool(payload) {
  return uniqueMatches([
    ...(payload.tracking.allUpcomingMatches ?? []),
    ...(payload.tracking.upcomingMatches ?? [])
  ]).sort(
    (left, right) =>
      new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime()
  );
}

function uniqueMatches(matches) {
  return [...new Map(matches.map((match) => [match.id, match])).values()];
}

function findLiveMatches(payload) {
  return getUpcomingMatchPool(payload).filter(
    (match) => match.status === 'live'
  );
}

function renderLiveMatches(panel, container, matches) {
  if (!panel || !container) {
    return;
  }

  container.replaceChildren();
  panel.hidden = matches.length === 0;

  const label = document.querySelector('#live-match-label');
  const heading = document.querySelector('#live-match-heading');
  const summary = document.querySelector('#live-match-summary');

  if (matches.length === 0) {
    if (label) {
      label.textContent = 'Live match';
    }

    if (heading) {
      heading.textContent = 'On now';
    }

    if (summary) {
      summary.textContent = 'Live';
    }

    return;
  }

  if (label) {
    label.textContent = matches.length === 1 ? 'Live match' : 'Live matches';
  }

  if (heading) {
    heading.textContent =
      matches.length === 1 ? 'On now' : `${matches.length} on now`;
  }

  if (summary) {
    summary.textContent =
      matches.length === 1
        ? liveMatchLabel(matches[0])
        : `${matches.length} live`;
  }

  for (const match of matches) {
    container.append(renderMatchCard(match, 'upcoming'));
  }
}

function renderPreviewMatchCard(variant) {
  return renderMatchCard(
    {
      id: `preview-${variant}`,
      utcDate: new Date(Date.now() + 86400000).toISOString(),
      round: 'Preview',
      status: variant === 'result' ? 'finished' : 'scheduled',
      homeTeam: variant === 'result' ? 'Mexico' : 'Mexico',
      awayTeam: variant === 'result' ? 'South Africa' : 'South Africa',
      homeFlagImageUrl: 'https://flagcdn.com/w80/mx.png',
      awayFlagImageUrl: 'https://flagcdn.com/w80/za.png',
      homeGoals: variant === 'result' ? 2 : null,
      awayGoals: variant === 'result' ? 1 : null,
      winnerTeam: variant === 'result' ? 'Mexico' : null,
      homeParticipantName: 'Darcy',
      awayParticipantName: 'Joe',
      participantNames: ['Darcy', 'Joe'],
      isPreview: true
    },
    variant
  );
}

function renderMatchCard(match, variant) {
  const item = document.createElement('article');
  item.className = `match-item ${variant === 'result' ? 'is-result' : 'is-upcoming'}${match.status === 'live' ? ' is-live' : ''}${match.isPreview ? ' is-preview' : ''}`;

  const header = document.createElement('div');
  header.className = 'match-card-header';

  const round = document.createElement('span');
  round.className = 'match-round';
  round.textContent = match.round;

  const time = document.createElement('time');
  time.dateTime = match.utcDate;
  time.textContent = new Date(match.utcDate).toLocaleString();

  header.append(round, time);

  const body = document.createElement('div');
  body.className = 'match-card-body';

  const teams = document.createElement('div');
  teams.className = 'match-teams';
  teams.append(
    renderTeamRow(
      match.homeFlagImageUrl,
      match.homeTeam,
      match.homeParticipantName
    ),
    renderTeamRow(
      match.awayFlagImageUrl,
      match.awayTeam,
      match.awayParticipantName
    )
  );

  const marker = document.createElement('div');
  marker.className = 'match-marker';

  if (variant === 'result') {
    const score = document.createElement('strong');
    score.className = 'scoreline';
    score.textContent = `${match.homeGoals ?? '-'} - ${match.awayGoals ?? '-'}`;

    const winner = document.createElement('span');
    winner.textContent = match.winnerTeam
      ? `Winner: ${match.winnerTeam}${winnerOwnerSuffix(match)}`
      : 'Draw';

    marker.append(score, winner);
  } else if (match.status === 'live') {
    const label = document.createElement('span');
    label.className = 'live-label';
    label.textContent = liveMatchLabel(match);

    const score = document.createElement('strong');
    score.className = 'scoreline';
    score.textContent = `${match.homeGoals ?? '-'} - ${match.awayGoals ?? '-'}`;

    marker.append(label, score);
  } else {
    const label = document.createElement('span');
    label.textContent = 'Kickoff';

    const countdown = document.createElement('strong');
    countdown.dataset.countdownTarget = match.utcDate;
    countdown.textContent = 'Calculating';

    marker.append(label, countdown);
  }

  body.append(teams, marker);

  const owners = document.createElement('span');
  owners.className = 'match-owners';
  owners.textContent = match.isPreview
    ? `Example: ${ownershipSummary(match)}`
    : ownershipSummary(match);

  item.append(header, body, owners);
  return item;
}

function renderTeamRow(flagImageUrl, team, participantName) {
  const row = document.createElement('div');
  row.className = 'match-team-row';

  const label = document.createElement('span');
  label.className = 'match-team-name';
  label.append(
    renderFlagImage(flagImageUrl, team),
    document.createTextNode(team)
  );

  const owner = document.createElement('span');
  owner.className = participantName ? 'owner-pill' : 'owner-pill empty-owner';
  owner.textContent = participantName ?? 'Unowned';

  row.append(label, owner);
  return row;
}

function renderContenders(container, participants) {
  if (!container) {
    return;
  }

  container.replaceChildren();

  if (participants.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-copy';
    empty.textContent = 'No participant status available yet.';
    container.append(empty);
    return;
  }

  const hasAllocatedTeams = participants.some(
    (participant) => participant.teams.length > 0
  );

  if (!hasAllocatedTeams) {
    renderPreSweepRoster(container, participants);
    return;
  }

  const ranked = [...participants].sort(
    (left, right) =>
      right.teamsLeft - left.teamsLeft ||
      nextMatchTime(left.nextMatch) - nextMatchTime(right.nextMatch) ||
      left.participantName.localeCompare(right.participantName)
  );

  for (const participant of ranked) {
    const card = document.createElement('article');
    card.className = 'contender-card';

    const header = document.createElement('div');
    header.className = 'contender-header';

    const name = document.createElement('strong');
    name.textContent = participant.participantName;

    const left = document.createElement('span');
    left.className =
      participant.teamsLeft > 0 ? 'left-pill active' : 'left-pill eliminated';
    left.textContent = `${participant.teamsLeft} left`;

    header.append(name, left);

    const teams = document.createElement('div');
    teams.className = 'contender-teams';

    const visibleTeams = participant.teams;

    for (const team of visibleTeams) {
      const chip = document.createElement('span');
      chip.className =
        team.status === 'active'
          ? 'mini-team country-card active'
          : 'mini-team country-card eliminated';
      chip.append(renderFlagImage(team.nation.flagImageUrl, team.nation.name));
      const text = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = team.nation.name;
      const code = document.createElement('small');
      code.textContent = team.nation.code;
      text.append(name, code);
      chip.append(text);
      teams.append(chip);
    }

    const run = document.createElement('span');
    run.className = 'contender-run';
    run.textContent = participant.runSummary;

    card.append(header, teams, run);
    container.append(card);
  }
}

function renderPreSweepRoster(container, participants) {
  const preview = document.createElement('article');
  preview.className = 'pre-sweep-preview';

  const previewCopy = document.createElement('div');
  const previewLabel = document.createElement('p');
  previewLabel.className = 'eyebrow';
  previewLabel.textContent = 'After the draw';
  const previewTitle = document.createElement('strong');
  previewTitle.textContent = 'Each participant will show three flag cards here';
  const previewDetail = document.createElement('span');
  previewDetail.textContent =
    'Cards will fade when a nation is knocked out, and next-match/prize tracking will update automatically.';
  previewCopy.append(previewLabel, previewTitle, previewDetail);

  const teams = document.createElement('div');
  teams.className = 'sample-team-strip';
  for (const team of [
    {
      name: 'Mexico',
      code: 'MEX',
      flagImageUrl: 'https://flagcdn.com/w80/mx.png'
    },
    {
      name: 'South Africa',
      code: 'RSA',
      flagImageUrl: 'https://flagcdn.com/w80/za.png'
    },
    {
      name: 'Brazil',
      code: 'BRA',
      flagImageUrl: 'https://flagcdn.com/w80/br.png'
    }
  ]) {
    const chip = document.createElement('span');
    chip.className = 'mini-team country-card is-preview';
    chip.append(renderFlagImage(team.flagImageUrl, team.name));
    const text = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = team.name;
    const code = document.createElement('small');
    code.textContent = team.code;
    text.append(name, code);
    chip.append(text);
    teams.append(chip);
  }
  preview.append(previewCopy, teams);
  container.append(preview);

  const roster = document.createElement('div');
  roster.className = 'pre-sweep-roster';

  for (const [index, participant] of participants.entries()) {
    const card = document.createElement('article');
    card.className = 'roster-card';

    const avatar = document.createElement('span');
    avatar.className = `participant-avatar avatar-${index}`;
    avatar.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = participant.participantName;
    const state = document.createElement('small');
    state.textContent = 'Awaiting draw';
    copy.append(name, state);

    card.append(avatar, copy);
    roster.append(card);
  }

  container.append(roster);
}

function renderParticipantTracking(participants) {
  for (const participant of participants) {
    const teamsLeftCell = document.querySelector(
      `[data-teams-left-for="${cssEscape(participant.participantName)}"]`
    );
    const nextMatchCell = document.querySelector(
      `[data-next-match-for="${cssEscape(participant.participantName)}"]`
    );
    const runCell = document.querySelector(
      `[data-run-for="${cssEscape(participant.participantName)}"]`
    );

    if (teamsLeftCell) {
      teamsLeftCell.textContent = String(participant.teamsLeft);
    }

    if (nextMatchCell) {
      nextMatchCell.replaceChildren(renderNextMatch(participant.nextMatch));
    }

    if (runCell) {
      runCell.textContent = participant.runSummary;
    }
  }
}

function renderNextMatch(match) {
  const element = document.createElement('span');
  element.className = 'next-match';

  if (!match) {
    element.textContent = 'No upcoming match';
    return element;
  }

  element.textContent = matchTitle(match);
  return element;
}

function nextMatchTime(match) {
  return match ? new Date(match.utcDate).getTime() : Number.MAX_SAFE_INTEGER;
}

function ownershipSummary(match) {
  if (match.homeParticipantName && match.awayParticipantName) {
    if (match.homeParticipantName === match.awayParticipantName) {
      return `Sweep participant: ${match.homeParticipantName} owns both teams`;
    }

    return `Sweep matchup: ${match.homeParticipantName} vs ${match.awayParticipantName}`;
  }

  if (match.homeParticipantName) {
    return `Sweep participant: ${match.homeParticipantName}`;
  }

  if (match.awayParticipantName) {
    return `Sweep participant: ${match.awayParticipantName}`;
  }

  return 'No sweep participants assigned';
}

function winnerOwnerSuffix(match) {
  if (match.winnerTeam === match.homeTeam && match.homeParticipantName) {
    return ` (${match.homeParticipantName})`;
  }

  if (match.winnerTeam === match.awayTeam && match.awayParticipantName) {
    return ` (${match.awayParticipantName})`;
  }

  return '';
}

function matchTitle(match) {
  if (match.status === 'live') {
    return `${match.homeTeam} ${match.homeGoals ?? '-'} - ${match.awayGoals ?? '-'} ${match.awayTeam}`;
  }

  return `${match.homeTeam} vs ${match.awayTeam}`;
}

function liveMatchLabel(match) {
  if (match.status !== 'live') {
    return new Date(match.utcDate).toLocaleString();
  }

  return formatLiveMinute(match);
}

function formatLiveMinute(match) {
  if (!Number.isInteger(match.minute)) {
    return 'Live';
  }

  const injuryTime =
    Number.isInteger(match.injuryTime) && match.injuryTime > 0
      ? `+${match.injuryTime}`
      : '';

  return `Live ${match.minute}${injuryTime}'`;
}

function renderNationStatuses(nations) {
  let activeCount = 0;
  let eliminatedCount = 0;

  for (const team of nations) {
    const chip = document.querySelector(
      `[data-nation-status="${cssEscape(team.nation.name)}"]`
    );

    if (!chip) {
      continue;
    }

    chip.classList.toggle('eliminated', team.status === 'eliminated');
    chip.classList.toggle('active', team.status === 'active');
    chip.title =
      team.status === 'eliminated' ? 'Eliminated' : 'Still in the cup';

    if (team.status === 'eliminated') {
      eliminatedCount += 1;
    } else {
      activeCount += 1;
    }
  }

  const summary = document.querySelector('#nation-status-summary');

  if (summary) {
    summary.textContent =
      eliminatedCount > 0
        ? `${activeCount} active, ${eliminatedCount} out`
        : `${activeCount} nations active`;
  }
}

function renderFlagImage(flagImageUrl, team) {
  const image = document.createElement('img');
  image.className = 'flag-img';
  image.src = flagImageUrl;
  image.width = 40;
  image.height = 30;
  image.alt = `${team} flag`;
  image.loading = 'lazy';
  return image;
}

function updateCountdowns() {
  const now = Date.now();

  for (const element of document.querySelectorAll('[data-countdown-target]')) {
    const target = new Date(element.dataset.countdownTarget ?? '').getTime();

    if (Number.isNaN(target)) {
      element.textContent = 'Date unavailable';
      continue;
    }

    element.textContent = formatCountdown(target - now);
  }
}

function formatCountdown(milliseconds) {
  if (milliseconds <= 0) {
    return 'Now';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const weeks = Math.floor(totalSeconds / 604800);
  const days = Math.floor((totalSeconds % 604800) / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (weeks > 0) {
    return `${weeks}w ${days}d`;
  }

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function cssEscape(value) {
  if ('CSS' in globalThis && typeof globalThis.CSS.escape === 'function') {
    return globalThis.CSS.escape(value);
  }

  return value.replaceAll('"', '\\"');
}

function getRefreshDelay(payload) {
  const matches = [
    ...(payload.tracking.upcomingMatches ?? []),
    ...(payload.tracking.allUpcomingMatches ?? [])
  ];

  if (matches.some((match) => match.status === 'live')) {
    return 15 * 1000;
  }

  const now = Date.now();
  const hasNearMatch = matches.some((match) => {
    if (match.status === 'finished') {
      return false;
    }

    const kickoff = new Date(match.utcDate).getTime();
    return now >= kickoff - 15 * 60 * 1000 && now <= kickoff + 180 * 60 * 1000;
  });

  return hasNearMatch ? 60 * 1000 : 2 * 60 * 1000;
}

function scheduleDashboardRefresh(delayMs) {
  globalThis.clearTimeout(globalThis.dashboardRefreshTimer);
  globalThis.dashboardRefreshTimer = globalThis.setTimeout(
    refreshDashboard,
    delayMs
  );
}

void refreshDashboard();
updateCountdowns();
setInterval(updateCountdowns, 1000);
