import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../config/env.js';
import type { WorldCupSnapshot } from '../domain/sweep.js';
import { createWorldCupProvider } from '../services/worldCupProvider.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Football-Data provider', () => {
  it('maps World Cup matches and standings into a sweep snapshot', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        expect(init?.headers).toMatchObject({
          'X-Auth-Token': 'football-data-test-key'
        });

        if (
          url ===
          'https://api.football-data.test/v4/competitions/WC/matches?season=2026'
        ) {
          return jsonResponse({
            matches: [
              {
                id: 123,
                utcDate: '2026-06-18T19:00:00Z',
                status: 'IN_PLAY',
                stage: 'GROUP_STAGE',
                group: 'GROUP_E',
                matchday: 1,
                homeTeam: { name: 'Germany' },
                awayTeam: { name: 'Cura\u00e7ao' },
                score: {
                  winner: null,
                  fullTime: {
                    home: 1,
                    away: 0
                  }
                }
              }
            ]
          });
        }

        if (
          url ===
          'https://api.football-data.test/v4/competitions/WC/standings?season=2026'
        ) {
          return jsonResponse({
            standings: [
              {
                type: 'TOTAL',
                group: 'GROUP_E',
                table: [
                  {
                    position: 1,
                    team: { name: 'Germany' },
                    points: 3,
                    playedGames: 1,
                    won: 1,
                    draw: 0,
                    lost: 0,
                    goalDifference: 1
                  }
                ]
              }
            ]
          });
        }

        throw new Error(`Unexpected URL ${url}`);
      }
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const provider = createWorldCupProvider(
      parseEnv({
        RESULTS_PROVIDER: 'football-data',
        FOOTBALL_DATA_KEY: 'football-data-test-key',
        FOOTBALL_DATA_BASE_URL: 'https://api.football-data.test/v4'
      })
    );
    const snapshot = await provider.getSnapshot();

    expect(snapshot.source).toBe('football-data');
    expect(snapshot.matches[0]).toMatchObject({
      id: '123',
      round: 'Group E',
      status: 'live',
      homeTeam: 'Germany',
      awayTeam: 'Cura\u00e7ao',
      homeGoals: 1,
      awayGoals: 0,
      winnerTeam: null
    });
    expect(snapshot.standings[0]).toMatchObject({
      teamName: 'Germany',
      group: 'Group E',
      rank: 1,
      points: 3,
      played: 1,
      wins: 1
    });
  });

  it('refreshes relevant football-data matches by id during match windows', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === 'https://api.football-data.test/v4/matches/123') {
        return jsonResponse({
          match: {
            id: 123,
            utcDate: '2026-06-18T19:00:00Z',
            status: 'FINISHED',
            stage: 'GROUP_STAGE',
            group: 'GROUP_E',
            homeTeam: { name: 'Germany' },
            awayTeam: { name: 'Cura\u00e7ao' },
            score: {
              winner: 'AWAY_TEAM',
              fullTime: {
                homeTeam: 1,
                awayTeam: 2
              }
            }
          }
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const provider = createWorldCupProvider(
      parseEnv({
        RESULTS_PROVIDER: 'football-data',
        FOOTBALL_DATA_KEY: 'football-data-test-key',
        FOOTBALL_DATA_BASE_URL: 'https://api.football-data.test/v4'
      })
    );
    const snapshot: WorldCupSnapshot = {
      source: 'football-data',
      updatedAt: '2026-06-18T18:00:00.000Z',
      standings: [],
      matches: [
        {
          id: '123',
          utcDate: '2026-06-18T19:00:00.000Z',
          round: 'Group E',
          status: 'scheduled',
          homeTeam: 'Germany',
          awayTeam: 'Cura\u00e7ao',
          homeGoals: null,
          awayGoals: null,
          winnerTeam: null
        }
      ]
    };

    const refreshed = await provider.refreshRelevantSnapshot?.(
      snapshot,
      new Date('2026-06-18T20:00:00.000Z')
    );

    expect(refreshed?.matches[0]).toMatchObject({
      status: 'finished',
      homeGoals: 1,
      awayGoals: 2,
      winnerTeam: 'Cura\u00e7ao'
    });
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json'
    }
  });
}
