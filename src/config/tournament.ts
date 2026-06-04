export const sweepDrawAtIso = '2026-06-11T10:00:00.000Z';
export const worldCupKickoffAtIso = '2026-06-11T19:00:00.000Z';

export const tournamentSchedule = {
  sweepDraw: {
    label: 'Sweep draw',
    iso: sweepDrawAtIso,
    display: '8:00 PM AEST, Thursday 11 June 2026'
  },
  worldCupKickoff: {
    label: 'World Cup kickoff',
    iso: worldCupKickoffAtIso,
    display: '5:00 AM AEST, Friday 12 June 2026'
  }
} as const;

