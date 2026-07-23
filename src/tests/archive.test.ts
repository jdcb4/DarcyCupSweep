import { describe, expect, it } from 'vitest';
import { getArchivedSweep } from '../data/sweepArchives.js';

describe('archived sweep outcomes', () => {
  const worldCupArchive = getArchivedSweep('2026-football-world-cup');

  it('stores World Cup participant totals as the sum of entry prizes', () => {
    expect(worldCupArchive).toBeDefined();

    for (const participant of worldCupArchive?.participants ?? []) {
      const entryPrizeTotal = participant.entries.reduce(
        (sum, entry) => sum + entry.prizeUsd,
        0
      );

      expect(participant.totalPrizeUsd).toBe(entryPrizeTotal);
    }
  });

  it('stores corrected country outcomes independently of match rendering', () => {
    const joe = worldCupArchive?.participants.find(
      (participant) => participant.participantName === 'Joe'
    );
    const colombia = joe?.entries.find((entry) => entry.name === 'Colombia');
    const netherlands = joe?.entries.find(
      (entry) => entry.name === 'Netherlands'
    );

    expect(colombia?.outcome).toBe('Round of 16');
    expect(netherlands?.outcome).toBe('Round of 32');
    expect(colombia?.prizeReasons).toEqual(['Group winner']);
    expect(netherlands?.prizeReasons).toEqual(['Group winner']);
  });
});
