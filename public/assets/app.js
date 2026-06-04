const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

async function refreshDashboard() {
  const providerLabel = document.querySelector('#provider-label');
  const status = document.querySelector('#provider-status');
  const lastUpdated = document.querySelector('#last-updated');
  const matchList = document.querySelector('#match-countdowns-list');

  try {
    const response = await fetch('/api/sweep');

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = await response.json();

    providerLabel.textContent = payload.snapshot.source;
    lastUpdated.textContent = `Updated ${new Date(payload.snapshot.updatedAt).toLocaleString()}`;
    status.textContent =
      payload.snapshot.source === 'mock'
        ? 'Mock provider active. Add API_FOOTBALL_KEY and set RESULTS_PROVIDER=api-football for live data.'
        : 'Live provider active.';
    renderMatches(matchList, payload.snapshot.matches);

    if (payload.sweep.status === 'active') {
      for (const standing of payload.leaderboard) {
        const prizeCell = document.querySelector(`[data-prize-for="${cssEscape(standing.participantName)}"]`);

        if (prizeCell) {
          prizeCell.textContent = formatter.format(standing.prizeUsd);
        }
      }
    }
  } catch (error) {
    providerLabel.textContent = 'Unavailable';
    lastUpdated.textContent = 'Snapshot failed';
    status.textContent = error instanceof Error ? error.message : 'Unable to load latest World Cup data.';
    renderMatches(matchList, []);
  }
}

function renderMatches(container, matches) {
  if (!container) {
    return;
  }

  const upcoming = matches
    .filter((match) => match.status !== 'finished')
    .sort((left, right) => new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime())
    .slice(0, 6);

  container.replaceChildren();

  if (upcoming.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-copy';
    empty.textContent = 'No upcoming fixtures identified yet.';
    container.append(empty);
    return;
  }

  for (const match of upcoming) {
    const item = document.createElement('article');
    item.className = 'match-item';

    const teams = document.createElement('strong');
    teams.textContent = `${match.homeTeam} vs ${match.awayTeam}`;

    const meta = document.createElement('span');
    meta.textContent = `${match.round} · ${new Date(match.utcDate).toLocaleString()}`;

    const countdown = document.createElement('time');
    countdown.dateTime = match.utcDate;
    countdown.dataset.countdownTarget = match.utcDate;
    countdown.textContent = 'Calculating';

    item.append(teams, meta, countdown);
    container.append(item);
  }

  updateCountdowns();
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

void refreshDashboard();
updateCountdowns();
setInterval(updateCountdowns, 1000);
