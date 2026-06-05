import { z } from 'zod';
import type { AppEnv } from '../config/env.js';
import { worldCupKickoffAtIso } from '../config/tournament.js';
import { worldCupSnapshotSchema, type Match, type WorldCupSnapshot } from '../domain/sweep.js';

export interface WorldCupProvider {
  getSnapshot(): Promise<WorldCupSnapshot>;
  refreshRelevantSnapshot?(snapshot: WorldCupSnapshot, now?: Date): Promise<WorldCupSnapshot>;
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

  if (env.RESULTS_PROVIDER === 'openfootball') {
    return new OpenFootballProvider(env);
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

  async refreshRelevantSnapshot(snapshot: WorldCupSnapshot, now = new Date()): Promise<WorldCupSnapshot> {
    const relevantMatches = getApiFootballRelevantMatches(snapshot.matches, now);

    if (relevantMatches.length === 0) {
      return snapshot;
    }

    const refreshedMatches = await Promise.all(relevantMatches.map((match) => this.getFixtureById(match.id)));
    const refreshedById = new Map(refreshedMatches.map((match) => [match.id, match]));

    return worldCupSnapshotSchema.parse({
      ...snapshot,
      source: 'api-football',
      updatedAt: new Date().toISOString(),
      matches: snapshot.matches.map((match) => refreshedById.get(match.id) ?? match)
    });
  }

  private async getFixtures(): Promise<Match[]> {
    const url = new URL('/fixtures', this.env.API_FOOTBALL_BASE_URL);
    url.searchParams.set('league', '1');
    url.searchParams.set('season', '2026');

    const payload = apiFootballFixturesSchema.parse(await this.getJson(url));

    return payload.response.map(mapApiFootballFixture);
  }

  private async getFixtureById(id: string): Promise<Match> {
    const url = new URL('/fixtures', this.env.API_FOOTBALL_BASE_URL);
    url.searchParams.set('id', id);

    const payload = apiFootballFixturesSchema.parse(await this.getJson(url));
    const fixture = payload.response[0];

    if (!fixture) {
      throw new Error(`API-FOOTBALL fixture ${id} was not found.`);
    }

    return mapApiFootballFixture(fixture);
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

function mapApiFootballFixture(fixture: z.infer<typeof apiFootballFixtureSchema>): Match {
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
}

function getApiFootballRelevantMatches(matches: Match[], now: Date): Match[] {
  const nowMs = now.getTime();
  const fifteenMinutes = 15 * 60 * 1000;
  const threeHours = 3 * 60 * 60 * 1000;

  return matches.filter((match) => {
    const kickoff = new Date(match.utcDate).getTime();
    return nowMs >= kickoff - fifteenMinutes && nowMs <= kickoff + threeHours;
  });
}

class OpenFootballProvider implements WorldCupProvider {
  constructor(private readonly env: AppEnv) {}

  async getSnapshot(): Promise<WorldCupSnapshot> {
    const [groupStageText, finalsText] = await Promise.all([this.getText('cup.txt'), this.getText('cup_finals.txt')]);
    const matches = [...parseOpenFootballMatches(groupStageText), ...parseOpenFootballMatches(finalsText)];

    return worldCupSnapshotSchema.parse({
      source: 'openfootball',
      updatedAt: new Date().toISOString(),
      standings: [],
      matches
    });
  }

  private async getText(fileName: string): Promise<string> {
    const response = await fetch(new URL(fileName, `${this.env.OPENFOOTBALL_BASE_URL.replace(/\/$/, '')}/`));

    if (!response.ok) {
      throw new Error(`OpenFootball request failed for ${fileName} with ${response.status} ${response.statusText}.`);
    }

    return response.text();
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

export function parseOpenFootballMatches(source: string): Match[] {
  const matches: Match[] = [];
  let currentDate: OpenFootballDate | null = null;
  let currentRound = 'Group stage';

  for (const rawLine of toOpenFootballLogicalLines(source)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#') || line.startsWith('=')) {
      continue;
    }

    if (line.startsWith('\u25aa')) {
      currentRound = line.replace(/^\S+\s*/, '').trim();
      continue;
    }

    if (line.startsWith('▪')) {
      currentRound = line.replace(/^▪\s*/, '').trim();
      continue;
    }

    const date = parseOpenFootballDate(line);

    if (date) {
      currentDate = date;
      continue;
    }

    const match = parseOpenFootballMatchLine(line, currentDate, currentRound);

    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

function toOpenFootballLogicalLines(source: string): string[] {
  const logicalLines: string[] = [];
  let pending = '';

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (pending && !pending.includes('@') && !isOpenFootballControlLine(pending) && !isOpenFootballControlLine(line)) {
      pending = `${pending} ${line}`;
      continue;
    }

    if (pending) {
      logicalLines.push(pending);
    }

    pending = line;
  }

  if (pending) {
    logicalLines.push(pending);
  }

  return logicalLines;
}

function isOpenFootballControlLine(line: string): boolean {
  return line.startsWith('#') || line.startsWith('=') || line.startsWith('\u25aa') || line.startsWith('â') || parseOpenFootballDate(line) !== null;
}

interface OpenFootballDate {
  year: number;
  month: number;
  day: number;
}

const monthNumbers = new Map([
  ['jan', 0],
  ['january', 0],
  ['feb', 1],
  ['february', 1],
  ['mar', 2],
  ['march', 2],
  ['apr', 3],
  ['april', 3],
  ['may', 4],
  ['jun', 5],
  ['june', 5],
  ['jul', 6],
  ['july', 6],
  ['aug', 7],
  ['august', 7],
  ['sep', 8],
  ['september', 8],
  ['oct', 9],
  ['october', 9],
  ['nov', 10],
  ['november', 10],
  ['dec', 11],
  ['december', 11]
]);

function parseOpenFootballDate(line: string): OpenFootballDate | null {
  const match = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]+)\s+(\d{1,2})$/i.exec(line);

  if (!match) {
    return null;
  }

  const month = monthNumbers.get(match[1].toLocaleLowerCase('en-US'));

  if (month === undefined) {
    return null;
  }

  return {
    year: 2026,
    month,
    day: Number(match[2])
  };
}

function parseOpenFootballMatchLine(line: string, currentDate: OpenFootballDate | null, currentRound: string): Match | null {
  if (!currentDate) {
    return null;
  }

  const scheduledMatch =
    /^(?:\((\d+)\)\s*)?(\d{1,2}:\d{2})\s+UTC([+-]\d{1,2})\s+(.+?)\s+v\s+(.+?)\s+@\s+(.+?)\s*$/.exec(line);

  if (scheduledMatch) {
    const [, matchNumber, time, offset, homeTeam, awayTeam, venue] = scheduledMatch;

    return {
      id: `openfootball-${matchNumber ?? slugify(`${currentRound}-${currentDate.month + 1}-${currentDate.day}-${time}-${homeTeam}-${awayTeam}`)}`,
      utcDate: toUtcIso(currentDate, time, Number(offset)),
      round: currentRound.startsWith('Group ') ? currentRound : `${currentRound} - ${venue.trim()}`,
      status: 'scheduled',
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeGoals: null,
      awayGoals: null,
      winnerTeam: null
    };
  }

  const resultMatch =
    /^(?:\((\d+)\)\s*)?(?:(\d{1,2}:\d{2})(?:\s+UTC([+-]\d{1,2}))?\s+)?(.+?)\s+(\d+)-(\d+)(?:\s+a\.e\.t\.?)?(?:\s+\([^@]*?\))?(?:,\s+(\d+)-(\d+)\s+pen\.?)?\s+(.+?)\s+@\s+(.+?)(?:\s+\(.*)?$/.exec(line);

  if (!resultMatch) {
    return null;
  }

  const [, matchNumber, time = '00:00', offset = '0', homeTeam, homeGoals, awayGoals, homePenalties, awayPenalties, awayTeam, venue] =
    resultMatch;
  const homeGoalCount = Number(homeGoals);
  const awayGoalCount = Number(awayGoals);
  const homePenaltyCount = homePenalties ? Number(homePenalties) : null;
  const awayPenaltyCount = awayPenalties ? Number(awayPenalties) : null;

  return {
    id: `openfootball-${matchNumber ?? slugify(`${currentRound}-${currentDate.month + 1}-${currentDate.day}-${time}-${homeTeam}-${awayTeam}`)}`,
    utcDate: toUtcIso(currentDate, time, Number(offset)),
    round: currentRound.startsWith('Group ') ? currentRound : `${currentRound} - ${venue.trim()}`,
    status: 'finished',
    homeTeam: homeTeam.trim(),
    awayTeam: awayTeam.trim(),
    homeGoals: homeGoalCount,
    awayGoals: awayGoalCount,
    winnerTeam: getOpenFootballWinner(homeTeam.trim(), awayTeam.trim(), homeGoalCount, awayGoalCount, homePenaltyCount, awayPenaltyCount)
  };
}

function getOpenFootballWinner(
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number,
  homePenalties: number | null,
  awayPenalties: number | null
): string | null {
  if (homeGoals > awayGoals) {
    return homeTeam;
  }

  if (awayGoals > homeGoals) {
    return awayTeam;
  }

  if (homePenalties !== null && awayPenalties !== null) {
    return homePenalties > awayPenalties ? homeTeam : awayTeam;
  }

  return null;
}

function toUtcIso(date: OpenFootballDate, time: string, utcOffsetHours: number): string {
  const [hour, minute] = time.split(':').map(Number);
  const utcHour = hour - utcOffsetHours;
  return new Date(Date.UTC(date.year, date.month, date.day, utcHour, minute, 0, 0)).toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
