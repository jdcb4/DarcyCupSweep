import { describe, expect, it } from 'vitest';
import type { WorldCupSnapshot } from '../domain/sweep.js';
import {
  getPollingDecision,
  WorldCupSnapshotService
} from '../services/worldCupSnapshotService.js';

const snapshot: WorldCupSnapshot = {
  source: 'test',
  updatedAt: '2026-06-11T00:00:00.000Z',
  standings: [],
  matches: [
    {
      id: 'fixture-1',
      utcDate: '2026-06-11T10:00:00.000Z',
      round: 'Group A',
      status: 'scheduled',
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      homeGoals: null,
      awayGoals: null,
      winnerTeam: null
    }
  ]
};

describe('World Cup polling schedule', () => {
  it('polls OpenFootball every five minutes for the hour after nominal match end', () => {
    const decision = getPollingDecision(
      'openfootball',
      snapshot,
      new Date('2026-06-11T12:30:00.000Z')
    );

    expect(decision).toMatchObject({
      intervalMs: 5 * 60 * 1000,
      mode: 'full'
    });
  });

  it('polls OpenFootball hourly outside the post-match window', () => {
    const decision = getPollingDecision(
      'openfootball',
      snapshot,
      new Date('2026-06-11T13:01:00.000Z')
    );

    expect(decision).toMatchObject({
      intervalMs: 60 * 60 * 1000,
      mode: 'full'
    });
  });

  it('polls API-Football relevant fixtures every ten minutes around match windows', () => {
    const decision = getPollingDecision(
      'api-football',
      snapshot,
      new Date('2026-06-11T09:50:00.000Z')
    );

    expect(decision).toMatchObject({
      intervalMs: 10 * 60 * 1000,
      mode: 'relevant'
    });
  });

  it('polls football-data relevant fixtures every minute during likely result windows', () => {
    const decision = getPollingDecision(
      'football-data',
      snapshot,
      new Date('2026-06-11T11:30:00.000Z')
    );

    expect(decision).toMatchObject({
      intervalMs: 60 * 1000,
      mode: 'relevant'
    });
  });

  it('does a full football-data refresh every ten minutes outside likely result windows', () => {
    const decision = getPollingDecision(
      'football-data',
      snapshot,
      new Date('2026-06-11T11:00:00.000Z')
    );

    expect(decision).toMatchObject({
      intervalMs: 10 * 60 * 1000,
      mode: 'full'
    });
  });

  it('does a full API-Football refresh hourly outside match windows', () => {
    const decision = getPollingDecision(
      'api-football',
      snapshot,
      new Date('2026-06-11T14:01:00.000Z')
    );

    expect(decision).toMatchObject({
      intervalMs: 60 * 60 * 1000,
      mode: 'full'
    });
  });

  it('allows admins to force a full provider refresh into the cache', async () => {
    let calls = 0;
    const service = new WorldCupSnapshotService(
      {
        async getSnapshot() {
          calls += 1;

          return {
            ...snapshot,
            updatedAt: `2026-06-11T0${calls}:00:00.000Z`
          };
        }
      },
      'mock'
    );

    await service.getSnapshot();
    const refreshed = await service.refreshNow();

    expect(calls).toBe(2);
    expect(refreshed.updatedAt).toBe('2026-06-11T02:00:00.000Z');
    expect(service.getCachedSnapshot()?.updatedAt).toBe(
      '2026-06-11T02:00:00.000Z'
    );
  });
});
