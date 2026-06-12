import { z } from 'zod';

export const teamNameSchema = z.string().trim().min(1);

export const participantSchema = z.object({
  name: z.string().trim().min(1),
  teams: z.array(teamNameSchema).max(3)
});

export const sweepSchema = z
  .object({
    status: z.enum(['pre-sweep', 'active']).default('pre-sweep'),
    buyInUsd: z.number().int().positive(),
    teamsPerParticipant: z.number().int().positive(),
    prizesUsd: z.object({
      champion: z.number().int().nonnegative(),
      runnerUp: z.number().int().nonnegative(),
      groupWinner: z.number().int().nonnegative()
    }),
    participants: z.array(participantSchema).length(16)
  })
  .superRefine((sweep, context) => {
    const totalTeams = sweep.participants.reduce(
      (sum, participant) => sum + participant.teams.length,
      0
    );
    const expectedTeams = sweep.participants.length * sweep.teamsPerParticipant;

    if (totalTeams > expectedTeams) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Sweep has ${totalTeams} teams, expected at most ${expectedTeams}.`
      });
    }
  });

export const groupStandingSchema = z.object({
  teamName: teamNameSchema,
  group: z.string().trim().min(1),
  rank: z.number().int().positive(),
  points: z.number().int().nonnegative().default(0),
  played: z.number().int().nonnegative().default(0),
  wins: z.number().int().nonnegative().default(0),
  draws: z.number().int().nonnegative().default(0),
  losses: z.number().int().nonnegative().default(0),
  goalDifference: z.number().int().default(0)
});

export const matchSchema = z.object({
  id: z.string(),
  utcDate: z.string(),
  round: z.string(),
  status: z.enum(['scheduled', 'live', 'finished']),
  homeTeam: teamNameSchema,
  awayTeam: teamNameSchema,
  homeGoals: z.number().int().nonnegative().nullable(),
  awayGoals: z.number().int().nonnegative().nullable(),
  winnerTeam: teamNameSchema.nullable()
});

export const worldCupSnapshotSchema = z.object({
  source: z.string(),
  updatedAt: z.string(),
  standings: z.array(groupStandingSchema),
  matches: z.array(matchSchema)
});

export type Sweep = z.infer<typeof sweepSchema>;
export type GroupStanding = z.infer<typeof groupStandingSchema>;
export type Match = z.infer<typeof matchSchema>;
export type WorldCupSnapshot = z.infer<typeof worldCupSnapshotSchema>;

export interface PrizeEvent {
  teamName: string;
  label: 'Champion' | 'Runner-up' | 'Group winner';
  amountUsd: number;
}

export interface ParticipantStanding {
  participantName: string;
  teams: string[];
  prizeUsd: number;
  prizeEvents: PrizeEvent[];
}

export function calculatePrizeEvents(
  sweep: Sweep,
  snapshot: WorldCupSnapshot
): PrizeEvent[] {
  const groupWinners = getConcludedGroupWinners(snapshot).map((standing) => ({
    teamName: standing.teamName,
    label: 'Group winner' as const,
    amountUsd: sweep.prizesUsd.groupWinner
  }));

  const final = snapshot.matches.find(
    (match) =>
      match.round.toLowerCase().includes('final') && match.status === 'finished'
  );

  if (!final?.winnerTeam) {
    return groupWinners;
  }

  const runnerUp =
    normalizeTeamName(final.homeTeam) === normalizeTeamName(final.winnerTeam)
      ? final.awayTeam
      : final.homeTeam;

  return [
    ...groupWinners,
    {
      teamName: final.winnerTeam,
      label: 'Champion',
      amountUsd: sweep.prizesUsd.champion
    },
    {
      teamName: runnerUp,
      label: 'Runner-up',
      amountUsd: sweep.prizesUsd.runnerUp
    }
  ];
}

function getConcludedGroupWinners(snapshot: WorldCupSnapshot): GroupStanding[] {
  const standingsByGroup = new Map<string, GroupStanding[]>();

  for (const standing of snapshot.standings) {
    standingsByGroup.set(standing.group, [
      ...(standingsByGroup.get(standing.group) ?? []),
      standing
    ]);
  }

  return [...standingsByGroup.entries()].flatMap(([group, standings]) => {
    if (!isGroupComplete(group, standings, snapshot.matches)) {
      return [];
    }

    return standings.filter((standing) => standing.rank === 1);
  });
}

function isGroupComplete(
  group: string,
  standings: GroupStanding[],
  matches: Match[]
): boolean {
  const groupTeams = new Set(
    standings.map((standing) => normalizeTeamName(standing.teamName))
  );

  if (groupTeams.size < 2) {
    return false;
  }

  const expectedMatches = (groupTeams.size * (groupTeams.size - 1)) / 2;
  const finishedGroupMatches = matches.filter(
    (match) =>
      normalizeTeamName(match.round) === normalizeTeamName(group) &&
      match.status === 'finished' &&
      groupTeams.has(normalizeTeamName(match.homeTeam)) &&
      groupTeams.has(normalizeTeamName(match.awayTeam))
  );

  return finishedGroupMatches.length >= expectedMatches;
}

export function calculateLeaderboard(
  sweep: Sweep,
  snapshot: WorldCupSnapshot
): ParticipantStanding[] {
  const prizeEvents = calculatePrizeEvents(sweep, snapshot);

  return sweep.participants
    .map((participant) => {
      const participantTeamNames = new Set(
        participant.teams.map(normalizeTeamName)
      );
      const participantEvents = prizeEvents.filter((event) =>
        participantTeamNames.has(normalizeTeamName(event.teamName))
      );

      return {
        participantName: participant.name,
        teams: participant.teams,
        prizeUsd: participantEvents.reduce(
          (sum, event) => sum + event.amountUsd,
          0
        ),
        prizeEvents: participantEvents
      };
    })
    .sort(
      (left, right) =>
        right.prizeUsd - left.prizeUsd ||
        left.participantName.localeCompare(right.participantName)
    );
}

export function prizePoolUsd(sweep: Sweep): number {
  return sweep.buyInUsd * sweep.participants.length;
}

export function configuredTeamsCount(sweep: Sweep): number {
  return sweep.participants.reduce(
    (sum, participant) => sum + participant.teams.length,
    0
  );
}

export function expectedTeamsCount(sweep: Sweep): number {
  return sweep.participants.length * sweep.teamsPerParticipant;
}

export function getActivationIssues(
  sweep: Sweep,
  allowedTeamNames?: string[]
): string[] {
  const issues: string[] = [];
  const teamCounts = new Map<string, number>();
  const allowedTeams = allowedTeamNames
    ? new Set(allowedTeamNames.map(normalizeTeamName))
    : null;

  for (const participant of sweep.participants) {
    if (participant.teams.length !== sweep.teamsPerParticipant) {
      issues.push(
        `${participant.name} needs exactly ${sweep.teamsPerParticipant} teams.`
      );
    }

    for (const team of participant.teams) {
      const normalized = normalizeTeamName(team);
      teamCounts.set(normalized, (teamCounts.get(normalized) ?? 0) + 1);

      if (allowedTeams && !allowedTeams.has(normalized)) {
        issues.push(`${team} is not in the participating nations list.`);
      }
    }
  }

  const duplicates = [...teamCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([team]) => team);

  if (duplicates.length > 0) {
    issues.push(`Duplicate teams are not allowed: ${duplicates.join(', ')}.`);
  }

  if (configuredTeamsCount(sweep) !== expectedTeamsCount(sweep)) {
    issues.push(
      `Sweep needs ${expectedTeamsCount(sweep)} total teams before activation.`
    );
  }

  return issues;
}

export function normalizeTeamName(teamName: string): string {
  return teamName
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US');
}
