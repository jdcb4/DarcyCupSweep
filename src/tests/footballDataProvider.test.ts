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
          'X-Auth-Token': 'football-data-test-key',
          'X-Api-Version': 'v4.1'
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
                status: 'FINISHED',
                stage: 'GROUP_STAGE',
                group: 'GROUP_E',
                matchday: 1,
                homeTeam: { name: 'Germany', tla: 'GER' },
                awayTeam: { name: 'Cura\u00e7ao', tla: 'CUW' },
                score: {
                  winner: 'HOME_TEAM',
                  fullTime: {
                    home: 1,
                    away: 0
                  }
                }
              },
              {
                id: 124,
                utcDate: '2026-06-18T23:00:00Z',
                status: 'TIMED',
                stage: 'GROUP_STAGE',
                group: 'GROUP_H',
                matchday: 1,
                homeTeam: { name: 'Uruguay', tla: 'URY' },
                awayTeam: { name: 'Saudi Arabia', tla: 'KSA' },
                score: {
                  winner: null,
                  fullTime: {
                    home: null,
                    away: null
                  }
                }
              },
              {
                id: 125,
                utcDate: '2026-06-19T03:00:00Z',
                status: 'IN_PLAY',
                minute: 63,
                injuryTime: 2,
                stage: 'GROUP_STAGE',
                group: 'GROUP_D',
                matchday: 1,
                homeTeam: { name: 'United States', tla: 'USA' },
                awayTeam: { name: 'Paraguay', tla: 'PAR' },
                score: {
                  winner: 'HOME_TEAM',
                  fullTime: {
                    home: 2,
                    away: 1
                  }
                }
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
      status: 'finished',
      homeTeam: 'Germany',
      awayTeam: 'Curacao',
      homeGoals: 1,
      awayGoals: 0,
      winnerTeam: 'Germany'
    });
    expect(snapshot.matches[1]).toMatchObject({
      id: '124',
      round: 'Group H',
      status: 'scheduled',
      homeTeam: 'Uruguay',
      awayTeam: 'Saudi Arabia'
    });
    expect(snapshot.matches[2]).toMatchObject({
      id: '125',
      round: 'Group D',
      status: 'live',
      minute: 63,
      injuryTime: 2,
      homeTeam: 'USA',
      awayTeam: 'Paraguay',
      homeGoals: 2,
      awayGoals: 1,
      winnerTeam: null
    });
    expect(
      snapshot.standings.find((standing) => standing.teamName === 'Germany')
    ).toMatchObject({
      teamName: 'Germany',
      group: 'Group E',
      rank: 1,
      points: 3,
      played: 1,
      wins: 1
    });
  });

  it('refreshes relevant football-data matches by id during likely result windows', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        expect(init?.headers).toMatchObject({
          'X-Auth-Token': 'football-data-test-key',
          'X-Api-Version': 'v4.1'
        });

        if (url === 'https://api.football-data.test/v4/matches/123') {
          return jsonResponse({
            id: 123,
            utcDate: '2026-06-18T19:00:00Z',
            status: 'FINISHED',
            minute: null,
            injuryTime: null,
            stage: 'GROUP_STAGE',
            group: 'GROUP_E',
            homeTeam: { name: 'Germany', tla: 'GER' },
            awayTeam: { name: 'Cura\u00e7ao', tla: 'CUW' },
            score: {
              winner: 'AWAY_TEAM',
              fullTime: {
                homeTeam: 1,
                awayTeam: 2
              }
            }
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
          awayTeam: 'Curacao',
          homeGoals: null,
          awayGoals: null,
          winnerTeam: null
        }
      ]
    };

    const refreshed = await provider.refreshRelevantSnapshot?.(
      snapshot,
      new Date('2026-06-18T20:30:00.000Z')
    );

    expect(refreshed?.matches[0]).toMatchObject({
      status: 'finished',
      homeGoals: 1,
      awayGoals: 2,
      winnerTeam: 'Curacao'
    });
    expect(
      refreshed?.standings.find((standing) => standing.teamName === 'Curacao')
    ).toMatchObject({
      group: 'Group E',
      rank: 1,
      points: 3,
      played: 1
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
