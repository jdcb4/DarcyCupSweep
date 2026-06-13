const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Sydney',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Sydney',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
});

async function refreshSchedule() {
  const shell = document.querySelector('[data-api-path]');
  const apiPath = shell?.dataset.apiPath ?? '/api/sweep';
  const mode = shell?.dataset.scheduleMode ?? 'upcoming';
  const updated = document.querySelector('#schedule-updated');
  const list = document.querySelector(
    mode === 'finalised' ? '#all-finalised-matches' : '#all-upcoming-matches'
  );

  try {
    const response = await fetch(apiPath);

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = await response.json();
    const matches =
      mode === 'finalised'
        ? (payload.tracking.allFinalisedMatches ??
          payload.tracking.recentResults ??
          [])
        : (payload.tracking.allUpcomingMatches ??
          payload.tracking.upcomingMatches ??
          []);

    updated.textContent = `Updated ${new Date(payload.snapshot.updatedAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`;
    renderSchedule(list, matches, mode);
  } catch (error) {
    updated.textContent =
      error instanceof Error
        ? error.message
        : `Unable to load ${mode === 'finalised' ? 'finalised' : 'upcoming'} matches.`;
    renderSchedule(list, [], mode);
  }
}

function renderSchedule(container, matches, mode) {
  if (!container) {
    return;
  }

  const scheduledMatches =
    mode === 'finalised'
      ? matches
          .filter((match) => match.status === 'finished')
          .sort(
            (left, right) =>
              new Date(right.utcDate).getTime() -
              new Date(left.utcDate).getTime()
          )
      : matches
          .filter((match) => match.status !== 'finished')
          .sort(
            (left, right) =>
              new Date(left.utcDate).getTime() -
              new Date(right.utcDate).getTime()
          );

  container.replaceChildren();

  if (scheduledMatches.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-copy';
    empty.textContent =
      mode === 'finalised'
        ? 'No finalised matches identified yet.'
        : 'No upcoming matches identified yet.';
    container.append(empty);
    return;
  }

  for (const [dateLabel, dateMatches] of groupByAustralianDate(
    scheduledMatches
  )) {
    const group = document.createElement('section');
    group.className = 'schedule-day';

    const heading = document.createElement('h2');
    heading.textContent = dateLabel;

    const cards = document.createElement('div');
    cards.className = 'schedule-day-grid';

    for (const match of dateMatches) {
      cards.append(renderScheduleCard(match, mode));
    }

    group.append(heading, cards);
    container.append(group);
  }
}

function groupByAustralianDate(matches) {
  const groups = new Map();

  for (const match of matches) {
    const dateLabel = dateFormatter.format(new Date(match.utcDate));
    groups.set(dateLabel, [...(groups.get(dateLabel) ?? []), match]);
  }

  return groups;
}

function renderScheduleCard(match, mode) {
  const card = document.createElement('article');
  card.className = 'schedule-match-card';

  const time = document.createElement('time');
  time.dateTime = match.utcDate;
  time.textContent = timeFormatter.format(new Date(match.utcDate));

  const round = document.createElement('span');
  round.className = 'match-round';
  round.textContent = match.round;

  const score = document.createElement('strong');
  score.className = 'scoreline';
  score.textContent = finalScore(match);

  const teams = document.createElement('div');
  teams.className = 'schedule-teams';
  teams.append(
    renderTeam(
      match.homeFlagImageUrl,
      match.homeTeam,
      match.homeParticipantName
    ),
    renderTeam(
      match.awayFlagImageUrl,
      match.awayTeam,
      match.awayParticipantName
    )
  );

  const owners = document.createElement('span');
  owners.className = 'match-owners';
  owners.textContent = ownershipSummary(match);

  card.append(time, round);

  if (mode === 'finalised') {
    card.append(score);
  }

  card.append(teams, owners);
  return card;
}

function renderTeam(flagImageUrl, team, participantName) {
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

function finalScore(match) {
  const homeGoals = match.homeGoals ?? '-';
  const awayGoals = match.awayGoals ?? '-';
  const winner = match.winnerTeam ? ` · ${match.winnerTeam} won` : '';
  return `${homeGoals}-${awayGoals}${winner}`;
}

void refreshSchedule();
