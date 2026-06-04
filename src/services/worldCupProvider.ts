import { z } from 'zod';
import type { AppEnv } from '../config/env.js';
import { worldCupKickoffAtIso } from '../config/tournament.js';
import { worldCupSnapshotSchema, type Match, type WorldCupSnapshot } from '../domain/sweep.js';

export interface WorldCupProvider {
  getSnapshot(): Promise<WorldCupSnapshot>;
}

const apiFootballFixtureSchema = z.object({
  fixture: z.object({
    id: z.union([z.string(), z.number()]),
    date: z.string(),
    status: z.object({
      short: z.string()
    })
  }),
  league: z.object({
    round: z.string().default('Unknown')
  }),
  teams: z.object({
    home: z.object({
      name: z.string(),
      winner: z.boolean().nullable()
    }),
    away: z.object({
      name: z.string(),
      winner: z.boolean().nullable()
    })
  }),
  goals: z.object({
    home: z.number().int().nonnegative().nullable(),
    away: z.number().int().nonnegative().nullable()
  })
});

const apiFootballStandingsSchema = z.object({
  response: z.array(
    z.object({
      league: z.object({
        standings: z.array(
          z.array(
            z.object({
              rank: z.number().int().positive(),
              group: z.string(),
              team: z.object({ name: z.string() }),
              points: z.number().int().nonnegative().nullable(),
              goalsDiff: z.number().int().nullable(),
              all: z.object({
                played: z.number().int().nonnegative().nullable(),
                win: z.number().int().nonnegative().nullable(),
                draw: z.number().int().nonnegative().nullable(),
                lose: z.number().int().nonnegative().nullable()
              })
            })
          )
        )
      })
    })
  )
});

const apiFootballFixturesSchema = z.object({
  response: z.array(apiFootballFixtureSchema)
});

export function createWorldCupProvider(env: AppEnv): WorldCupProvider {
  if (env.RESULTS_PROVIDER === 'api-football') {
    return new ApiFootballProvider(env);
  }

  return new MockWorldCupProvider();
}

class MockWorldCupProvider implements WorldCupProvider {
  async getSnapshot(): Promise<WorldCupSnapshot> {
    return worldCupSnapshotSchema.parse({
      source: 'mock',
      updatedAt: new Date().toISOString(),
      standings: [],
      matches: [
        {
          id: 'opening-match',
          utcDate: worldCupKickoffAtIso,
          round: 'Group stage',
          status: 'scheduled',
          homeTeam: 'Mexico',
          awayTeam: 'South Africa',
          homeGoals: null,
          awayGoals: null,
          winnerTeam: null
        }
      ]
    });
  }
}

class ApiFootballProvider implements WorldCupProvider {
  constructor(private readonly env: AppEnv) {}

  async getSnapshot(): Promise<WorldCupSnapshot> {
    if (!this.env.API_FOOTBALL_KEY) {
      throw new Error('API_FOOTBALL_KEY is required when RESULTS_PROVIDER=api-football.');
    }

    const [fixtures, standings] = await Promise.all([this.getFixtures(), this.getStandings()]);

    return worldCupSnapshotSchema.parse({
      source: 'api-football',
      updatedAt: new Date().toISOString(),
      matches: fixtures,
      standings
    });
  }

  private async getFixtures(): Promise<Match[]> {
    const url = new URL('/fixtures', this.env.API_FOOTBALL_BASE_URL);
    url.searchParams.set('league', '1');
    url.searchParams.set('season', '2026');

    const payload = apiFootballFixturesSchema.parse(await this.getJson(url));

    return payload.response.map((fixture) => {
      const homeWinner = fixture.teams.home.winner === true;
      const awayWinner = fixture.teams.away.winner === true;

      return {
        id: String(fixture.fixture.id),
        utcDate: fixture.fixture.date,
        round: fixture.league.round,
        status: mapApiFootballStatus(fixture.fixture.status.short),
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeGoals: fixture.goals.home,
        awayGoals: fixture.goals.away,
        winnerTeam: homeWinner ? fixture.teams.home.name : awayWinner ? fixture.teams.away.name : null
      };
    });
  }

  private async getStandings() {
    const url = new URL('/standings', this.env.API_FOOTBALL_BASE_URL);
    url.searchParams.set('league', '1');
    url.searchParams.set('season', '2026');

    const payload = apiFootballStandingsSchema.parse(await this.getJson(url));
    const groups = payload.response[0]?.league.standings ?? [];

    return groups.flatMap((group) =>
      group.map((standing) => ({
        teamName: standing.team.name,
        group: standing.group,
        rank: standing.rank,
        points: standing.points ?? 0,
        played: standing.all.played ?? 0,
        wins: standing.all.win ?? 0,
        draws: standing.all.draw ?? 0,
        losses: standing.all.lose ?? 0,
        goalDifference: standing.goalsDiff ?? 0
      }))
    );
  }

  private async getJson(url: URL): Promise<unknown> {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': this.env.API_FOOTBALL_KEY ?? ''
      }
    });
    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(`API-FOOTBALL request failed with ${response.status} ${response.statusText}.`);
    }

    const apiError = getApiFootballError(payload);

    if (apiError) {
      throw new Error(`API-FOOTBALL error: ${apiError}`);
    }

    return payload;
  }
}

function getApiFootballError(payload: unknown): string | null {
  const parsed = z
    .object({
      errors: z.union([z.array(z.unknown()), z.record(z.unknown())]).optional()
    })
    .safeParse(payload);

  if (!parsed.success || !parsed.data.errors) {
    return null;
  }

  if (Array.isArray(parsed.data.errors)) {
    return parsed.data.errors.length > 0 ? parsed.data.errors.map(String).join(', ') : null;
  }

  const messages = Object.entries(parsed.data.errors).map(([key, value]) => `${key}: ${String(value)}`);

  return messages.length > 0 ? messages.join(', ') : null;
}

function mapApiFootballStatus(status: string): Match['status'] {
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(status)) {
    return 'live';
  }

  if (['FT', 'AET', 'PEN'].includes(status)) {
    return 'finished';
  }

  return 'scheduled';
}
