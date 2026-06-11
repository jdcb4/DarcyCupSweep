import { z } from 'zod';
import type { AppEnv } from '../config/env.js';
import { worldCupKickoffAtIso } from '../config/tournament.js';
import {
  worldCupSnapshotSchema,
  type Match,
  type WorldCupSnapshot
} from '../domain/sweep.js';

export interface WorldCupProvider {
  getSnapshot(): Promise<WorldCupSnapshot>;
  refreshRelevantSnapshot?(
    snapshot: WorldCupSnapshot,
    now?: Date
  ): Promise<WorldCupSnapshot>;
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

const footballDataTeamSchema = z
  .object({
    name: z.string().nullable().optional(),
    shortName: z.string().nullable().optional(),
    tla: z.string().nullable().optional()
  })
  .passthrough();

const footballDataScoreGoalsSchema = z
  .object({
    home: z.number().int().nonnegative().nullable().optional(),
    away: z.number().int().nonnegative().nullable().optional(),
    homeTeam: z.number().int().nonnegative().nullable().optional(),
    awayTeam: z.number().int().nonnegative().nullable().optional()
  })
  .passthrough();

const footballDataMatchSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    utcDate: z.string(),
    status: z.string(),
    stage: z.string().nullable().optional(),
    group: z.string().nullable().optional(),
    matchday: z.number().int().nullable().optional(),
    homeTeam: footballDataTeamSchema,
    awayTeam: footballDataTeamSchema,
    score: z
      .object({
        winner: z.string().nullable().optional(),
        fullTime: footballDataScoreGoalsSchema.optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

const footballDataMatchesSchema = z.object({
  matches: z.array(footballDataMatchSchema)
});

const footballDataSingleMatchSchema = z.object({
  match: footballDataMatchSchema
});

const footballDataStandingsSchema = z.object({
  standings: z.array(
    z
      .object({
        type: z.string().optional(),
        group: z.string().nullable().optional(),
        table: z.array(
          z
            .object({
              position: z.number().int().positive(),
              team: footballDataTeamSchema,
              points: z.number().int().nonnegative().nullable().optional(),
              playedGames: z.number().int().nonnegative().nullable().optional(),
              won: z.number().int().nonnegative().nullable().optional(),
              draw: z.number().int().nonnegative().nullable().optional(),
              lost: z.number().int().nonnegative().nullable().optional(),
              goalDifference: z.number().int().nullable().optional()
            })
            .passthrough()
        )
      })
      .passthrough()
  )
});

export function createWorldCupProvider(env: AppEnv): WorldCupProvider {
  if (env.RESULTS_PROVIDER === 'football-data') {
    return new FootballDataProvider(env);
  }

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

class FootballDataProvider implements WorldCupProvider {
  constructor(private readonly env: AppEnv) {}

  async getSnapshot(): Promise<WorldCupSnapshot> {
    if (!this.env.FOOTBALL_DATA_KEY) {
      throw new Error(
        'FOOTBALL_DATA_KEY is required when RESULTS_PROVIDER=football-data.'
      );
    }

    const [matches, standings] = await Promise.all([
      this.getMatches(),
      this.getStandings()
    ]);

    return worldCupSnapshotSchema.parse({
      source: 'football-data',
      updatedAt: new Date().toISOString(),
      matches,
      standings
    });
  }

  async refreshRelevantSnapshot(
    snapshot: WorldCupSnapshot,
    now = new Date()
  ): Promise<WorldCupSnapshot> {
    const relevantMatches = getMatchWindowRelevantMatches(
      snapshot.matches,
      now
    );

    if (relevantMatches.length === 0) {
      return snapshot;
    }

    const refreshedMatches = await Promise.all(
      relevantMatches.map((match) => this.getMatchById(match.id))
    );
    const refreshedById = new Map(
      refreshedMatches.map((match) => [match.id, match])
    );

    return worldCupSnapshotSchema.parse({
      ...snapshot,
      source: 'football-data',
      updatedAt: new Date().toISOString(),
      matches: snapshot.matches.map(
        (match) => refreshedById.get(match.id) ?? match
      )
    });
  }

  private async getMatches(): Promise<Match[]> {
    const url = this.url(
      `competitions/${encodeURIComponent(this.env.FOOTBALL_DATA_COMPETITION)}/matches`
    );
    url.searchParams.set('season', '2026');

    const payload = footballDataMatchesSchema.parse(await this.getJson(url));

    return payload.matches.map(mapFootballDataMatch);
  }

  private async getMatchById(id: string): Promise<Match> {
    const url = this.url(`matches/${encodeURIComponent(id)}`);
    const payload = footballDataSingleMatchSchema.parse(
      await this.getJson(url)
    );

    return mapFootballDataMatch(payload.match);
  }

  private async getStandings() {
    const url = this.url(
      `competitions/${encodeURIComponent(this.env.FOOTBALL_DATA_COMPETITION)}/standings`
    );
    url.searchParams.set('season', '2026');

    const payload = footballDataStandingsSchema.parse(await this.getJson(url));

    return payload.standings
      .filter((standing) => !standing.type || standing.type === 'TOTAL')
      .flatMap((standing) =>
        standing.table.map((row) => ({
          teamName: footballDataTeamName(row.team),
          group: standing.group
            ? formatFootballDataLabel(standing.group)
            : 'Group',
          rank: row.position,
          points: row.points ?? 0,
          played: row.playedGames ?? 0,
          wins: row.won ?? 0,
          draws: row.draw ?? 0,
          losses: row.lost ?? 0,
          goalDifference: row.goalDifference ?? 0
        }))
      );
  }

  private url(pathname: string): URL {
    return new URL(
      pathname,
      `${this.env.FOOTBALL_DATA_BASE_URL.replace(/\/$/, '')}/`
    );
  }

  private async getJson(url: URL): Promise<unknown> {
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': this.env.FOOTBALL_DATA_KEY ?? ''
      }
    });
    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(
        `football-data.org request failed with ${response.status} ${response.statusText}: ${getFootballDataError(payload)}`
      );
    }

    return payload;
  }
}

class ApiFootballProvider implements WorldCupProvider {
  constructor(private readonly env: AppEnv) {}

  async getSnapshot(): Promise<WorldCupSnapshot> {
    if (!this.env.API_FOOTBALL_KEY) {
      throw new Error(
        'API_FOOTBALL_KEY is required when RESULTS_PROVIDER=api-football.'
      );
    }

    const [fixtures, standings] = await Promise.all([
      this.getFixtures(),
      this.getStandings()
    ]);

    return worldCupSnapshotSchema.parse({
      source: 'api-football',
      updatedAt: new Date().toISOString(),
      matches: fixtures,
      standings
    });
  }

  async refreshRelevantSnapshot(
    snapshot: WorldCupSnapshot,
    now = new Date()
  ): Promise<WorldCupSnapshot> {
    const relevantMatches = getApiFootballRelevantMatches(
      snapshot.matches,
      now
    );

    if (relevantMatches.length === 0) {
      return snapshot;
    }

    const refreshedMatches = await Promise.all(
      relevantMatches.map((match) => this.getFixtureById(match.id))
    );
    const refreshedById = new Map(
      refreshedMatches.map((match) => [match.id, match])
    );

    return worldCupSnapshotSchema.parse({
      ...snapshot,
      source: 'api-football',
      updatedAt: new Date().toISOString(),
      matches: snapshot.matches.map(
        (match) => refreshedById.get(match.id) ?? match
      )
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
      throw new Error(
        `API-FOOTBALL request failed with ${response.status} ${response.statusText}.`
      );
    }

    const apiError = getApiFootballError(payload);

    if (apiError) {
      throw new Error(`API-FOOTBALL error: ${apiError}`);
    }

    return payload;
  }
}

function mapApiFootballFixture(
  fixture: z.infer<typeof apiFootballFixtureSchema>
): Match {
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
    winnerTeam: homeWinner
      ? fixture.teams.home.name
      : awayWinner
        ? fixture.teams.away.name
        : null
  };
}

function mapFootballDataMatch(
  match: z.infer<typeof footballDataMatchSchema>
): Match {
  const homeTeam = footballDataTeamName(match.homeTeam);
  const awayTeam = footballDataTeamName(match.awayTeam);
  const winner = match.score?.winner;

  return {
    id: String(match.id),
    utcDate: match.utcDate,
    round: formatFootballDataRound(match),
    status: mapFootballDataStatus(match.status),
    homeTeam,
    awayTeam,
    homeGoals: getFootballDataGoals(match.score?.fullTime, 'home'),
    awayGoals: getFootballDataGoals(match.score?.fullTime, 'away'),
    winnerTeam:
      winner === 'HOME_TEAM'
        ? homeTeam
        : winner === 'AWAY_TEAM'
          ? awayTeam
          : null
  };
}

function footballDataTeamName(
  team: z.infer<typeof footballDataTeamSchema>
): string {
  return team.name ?? team.shortName ?? team.tla ?? 'TBD';
}

function getFootballDataGoals(
  score: z.infer<typeof footballDataScoreGoalsSchema> | undefined,
  side: 'home' | 'away'
): number | null {
  if (!score) {
    return null;
  }

  return side === 'home'
    ? (score.home ?? score.homeTeam ?? null)
    : (score.away ?? score.awayTeam ?? null);
}

function formatFootballDataRound(
  match: z.infer<typeof footballDataMatchSchema>
): string {
  if (match.group) {
    return formatFootballDataLabel(match.group);
  }

  if (match.stage) {
    return formatFootballDataLabel(match.stage);
  }

  return match.matchday ? `Matchday ${match.matchday}` : 'Unknown';
}

function formatFootballDataLabel(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLocaleLowerCase('en-US')
    .replace(/\b[a-z]/g, (character) => character.toLocaleUpperCase('en-US'))
    .replace(/\bOf\b/g, 'of');
}

function getApiFootballRelevantMatches(matches: Match[], now: Date): Match[] {
  return getMatchWindowRelevantMatches(matches, now);
}

function getMatchWindowRelevantMatches(matches: Match[], now: Date): Match[] {
  const nowMs = now.getTime();
  const fifteenMinutes = 15 * 60 * 1000;
  const threeHours = 3 * 60 * 60 * 1000;

  return matches.filter((match) => {
    const kickoff = new Date(match.utcDate).getTime();
    return nowMs >= kickoff - fifteenMinutes && nowMs <= kickoff + threeHours;
  });
}

function mapFootballDataStatus(status: string): Match['status'] {
  if (['LIVE', 'IN_PLAY', 'PAUSED'].includes(status)) {
    return 'live';
  }

  if (status === 'FINISHED') {
    return 'finished';
  }

  return 'scheduled';
}

class OpenFootballProvider implements WorldCupProvider {
  constructor(private readonly env: AppEnv) {}

  async getSnapshot(): Promise<WorldCupSnapshot> {
    const [groupStageText, finalsText] = await Promise.all([
      this.getText('cup.txt'),
      this.getText('cup_finals.txt')
    ]);
    const matches = [
      ...parseOpenFootballMatches(groupStageText),
      ...parseOpenFootballMatches(finalsText)
    ];

    return worldCupSnapshotSchema.parse({
      source: 'openfootball',
      updatedAt: new Date().toISOString(),
      standings: [],
      matches
    });
  }

  private async getText(fileName: string): Promise<string> {
    const response = await fetch(
      new URL(fileName, `${this.env.OPENFOOTBALL_BASE_URL.replace(/\/$/, '')}/`)
    );

    if (!response.ok) {
      throw new Error(
        `OpenFootball request failed for ${fileName} with ${response.status} ${response.statusText}.`
      );
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
    return parsed.data.errors.length > 0
      ? parsed.data.errors.map(String).join(', ')
      : null;
  }

  const messages = Object.entries(parsed.data.errors).map(
    ([key, value]) => `${key}: ${String(value)}`
  );

  return messages.length > 0 ? messages.join(', ') : null;
}

function getFootballDataError(payload: unknown): string {
  const parsed = z
    .object({ message: z.string().optional(), error: z.string().optional() })
    .safeParse(payload);

  if (parsed.success) {
    return (
      parsed.data.message ?? parsed.data.error ?? 'no error message returned'
    );
  }

  return 'no error message returned';
}

function mapApiFootballStatus(status: string): Match['status'] {
  if (
    ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(status)
  ) {
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

    if (
      pending &&
      !pending.includes('@') &&
      !isOpenFootballControlLine(pending) &&
      !isOpenFootballControlLine(line)
    ) {
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
  return (
    line.startsWith('#') ||
    line.startsWith('=') ||
    line.startsWith('\u25aa') ||
    line.startsWith('â') ||
    parseOpenFootballDate(line) !== null
  );
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
  const match =
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]+)\s+(\d{1,2})$/i.exec(line);

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

function parseOpenFootballMatchLine(
  line: string,
  currentDate: OpenFootballDate | null,
  currentRound: string
): Match | null {
  if (!currentDate) {
    return null;
  }

  const scheduledMatch =
    /^(?:\((\d+)\)\s*)?(\d{1,2}:\d{2})\s+UTC([+-]\d{1,2})\s+(.+?)\s+v\s+(.+?)\s+@\s+(.+?)\s*$/.exec(
      line
    );

  if (scheduledMatch) {
    const [, matchNumber, time, offset, homeTeam, awayTeam, venue] =
      scheduledMatch;

    return {
      id: `openfootball-${matchNumber ?? slugify(`${currentRound}-${currentDate.month + 1}-${currentDate.day}-${time}-${homeTeam}-${awayTeam}`)}`,
      utcDate: toUtcIso(currentDate, time, Number(offset)),
      round: currentRound.startsWith('Group ')
        ? currentRound
        : `${currentRound} - ${venue.trim()}`,
      status: 'scheduled',
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeGoals: null,
      awayGoals: null,
      winnerTeam: null
    };
  }

  const resultMatch =
    /^(?:\((\d+)\)\s*)?(?:(\d{1,2}:\d{2})(?:\s+UTC([+-]\d{1,2}))?\s+)?(.+?)\s+(\d+)-(\d+)(?:\s+a\.e\.t\.?)?(?:\s+\([^@]*?\))?(?:,\s+(\d+)-(\d+)\s+pen\.?)?\s+(.+?)\s+@\s+(.+?)(?:\s+\(.*)?$/.exec(
      line
    );

  if (!resultMatch) {
    return null;
  }

  const [
    ,
    matchNumber,
    time = '00:00',
    offset = '0',
    homeTeam,
    homeGoals,
    awayGoals,
    homePenalties,
    awayPenalties,
    awayTeam,
    venue
  ] = resultMatch;
  const homeGoalCount = Number(homeGoals);
  const awayGoalCount = Number(awayGoals);
  const homePenaltyCount = homePenalties ? Number(homePenalties) : null;
  const awayPenaltyCount = awayPenalties ? Number(awayPenalties) : null;

  return {
    id: `openfootball-${matchNumber ?? slugify(`${currentRound}-${currentDate.month + 1}-${currentDate.day}-${time}-${homeTeam}-${awayTeam}`)}`,
    utcDate: toUtcIso(currentDate, time, Number(offset)),
    round: currentRound.startsWith('Group ')
      ? currentRound
      : `${currentRound} - ${venue.trim()}`,
    status: 'finished',
    homeTeam: homeTeam.trim(),
    awayTeam: awayTeam.trim(),
    homeGoals: homeGoalCount,
    awayGoals: awayGoalCount,
    winnerTeam: getOpenFootballWinner(
      homeTeam.trim(),
      awayTeam.trim(),
      homeGoalCount,
      awayGoalCount,
      homePenaltyCount,
      awayPenaltyCount
    )
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

function toUtcIso(
  date: OpenFootballDate,
  time: string,
  utcOffsetHours: number
): string {
  const [hour, minute] = time.split(':').map(Number);
  const utcHour = hour - utcOffsetHours;
  return new Date(
    Date.UTC(date.year, date.month, date.day, utcHour, minute, 0, 0)
  ).toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
