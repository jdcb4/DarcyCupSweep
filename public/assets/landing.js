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

updateCountdowns();
setInterval(updateCountdowns, 1000);
