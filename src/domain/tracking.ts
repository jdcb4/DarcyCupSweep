import type { Nation } from '../data/nations.js';
import {
  type Match,
  type Sweep,
  type WorldCupSnapshot,
  normalizeTeamName
} from './sweep.js';

export interface TeamStatus {
  nation: Nation;
  status: 'active' | 'eliminated';
  ownerName: string | null;
  nextMatch: TrackedMatch | null;
}

export interface ParticipantTracking {
  participantName: string;
  teams: TeamStatus[];
  teamsLeft: number;
  nextMatch: TrackedMatch | null;
  runSummary: string;
}

export interface TrackedMatch {
  id: string;
  utcDate: string;
  round: string;
  status: Match['status'];
  minute?: number | null;
  injuryTime?: number | null;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeFlagImageUrl: string;
  awayFlagImageUrl: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winnerTeam: string | null;
  homeParticipantName: string | null;
  awayParticipantName: string | null;
  participantNames: string[];
}

export interface SweepTracking {
  participants: ParticipantTracking[];
  nations: TeamStatus[];
  allUpcomingMatches: TrackedMatch[];
  allFinalisedMatches: TrackedMatch[];
  upcomingMatches: TrackedMatch[];
  recentResults: TrackedMatch[];
}

export function buildSweepTracking(
  sweep: Sweep,
  snapshot: WorldCupSnapshot,
  nations: Nation[]
): SweepTracking {
  const nationByName = new Map(
    nations.map((nation) => [normalizeTeamName(nation.name), nation])
  );
  const ownerByTeam = new Map<string, string>();

  for (const participant of sweep.participants) {
    for (const team of participant.teams) {
      ownerByTeam.set(normalizeTeamName(team), participant.name);
    }
  }

  const eliminatedTeams = deriveEliminatedTeams(snapshot, nations);
  const trackedMatches = snapshot.matches.map((match) =>
    toTrackedMatch(match, nationByName, ownerByTeam)
  );
  const allUpcomingMatches = trackedMatches
    .filter((match) => match.status !== 'finished')
    .sort(
      (left, right) =>
        new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime()
    );
  const allFinalisedMatches = trackedMatches
    .filter((match) => match.status === 'finished')
    .sort(
      (left, right) =>
        new Date(right.utcDate).getTime() - new Date(left.utcDate).getTime()
    );
  const upcomingMatches = allUpcomingMatches.slice(0, 4);
  const recentResults = allFinalisedMatches.slice(0, 4);
  const teamStatuses: TeamStatus[] = nations.map((nation) => {
    const normalized = normalizeTeamName(nation.name);
    const nextMatch = trackedMatches
      .filter(
        (match) =>
          match.status !== 'finished' &&
          (normalizeTeamName(match.homeTeam) === normalized ||
            normalizeTeamName(match.awayTeam) === normalized)
      )
      .sort(
        (left, right) =>
          new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime()
      )[0];

    return {
      nation,
      status: eliminatedTeams.has(normalized)
        ? ('eliminated' as const)
        : ('active' as const),
      ownerName: ownerByTeam.get(normalized) ?? null,
      nextMatch: nextMatch ?? null
    };
  });
  const teamStatusByName = new Map(
    teamStatuses.map((status) => [
      normalizeTeamName(status.nation.name),
      status
    ])
  );

  return {
    participants: sweep.participants.map((participant) => {
      const teams = participant.teams
        .map((team) => teamStatusByName.get(normalizeTeamName(team)))
        .filter((team): team is TeamStatus => Boolean(team));
      const nextMatch = teams
        .map((team) => team.nextMatch)
        .filter((match): match is TrackedMatch => Boolean(match))
        .sort(
          (left, right) =>
            new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime()
        )[0];
      const runSummary = getParticipantRunSummary(
        participant.teams,
        teams,
        trackedMatches,
        nextMatch ?? null
      );

      return {
        participantName: participant.name,
        teams,
        teamsLeft: teams.filter((team) => team.status === 'active').length,
        nextMatch: nextMatch ?? null,
        runSummary
      };
    }),
    nations: teamStatuses,
    allUpcomingMatches,
    allFinalisedMatches,
    upcomingMatches,
    recentResults
  };
}

function getParticipantRunSummary(
  teamNames: string[],
  teams: TeamStatus[],
  matches: TrackedMatch[],
  nextMatch: TrackedMatch | null
): string {
  if (teamNames.length === 0) {
    return 'Awaiting draw';
  }

  const activeCount = teams.filter((team) => team.status === 'active').length;

  if (activeCount > 0) {
    return nextMatch
      ? `Still alive - next ${shortRound(nextMatch.round)}`
      : 'Still alive';
  }

  const participantTeams = new Set(teamNames.map(normalizeTeamName));
  const furthestMatch = matches
    .filter(
      (match) =>
        participantTeams.has(normalizeTeamName(match.homeTeam)) ||
        participantTeams.has(normalizeTeamName(match.awayTeam))
    )
    .sort(
      (left, right) =>
        roundRank(right.round) - roundRank(left.round) ||
        new Date(right.utcDate).getTime() - new Date(left.utcDate).getTime()
    )[0];

  return furthestMatch
    ? `Reached ${shortRound(furthestMatch.round)}`
    : 'Eliminated';
}

function roundRank(round: string): number {
  const normalized = round.toLocaleLowerCase('en-US');

  if (
    normalized.includes('final') &&
    !normalized.includes('semi') &&
    !normalized.includes('quarter')
  ) {
    return 7;
  }

  if (normalized.includes('semi')) {
    return 6;
  }

  if (normalized.includes('quarter')) {
    return 5;
  }

  if (normalized.includes('round of 16')) {
    return 4;
  }

  if (normalized.includes('round of 32')) {
    return 3;
  }

  if (normalized.includes('group')) {
    return 2;
  }

  return 1;
}

function shortRound(round: string): string {
  return round.split(' - ')[0];
}

function toTrackedMatch(
  match: Match,
  nationByName: Map<string, Nation>,
  ownerByTeam: Map<string, string>
): TrackedMatch {
  const homeNation = nationByName.get(normalizeTeamName(match.homeTeam));
  const awayNation = nationByName.get(normalizeTeamName(match.awayTeam));
  const homeParticipantName =
    ownerByTeam.get(normalizeTeamName(match.homeTeam)) ?? null;
  const awayParticipantName =
    ownerByTeam.get(normalizeTeamName(match.awayTeam)) ?? null;
  const participantNames = [
    ...new Set(
      [homeParticipantName, awayParticipantName].filter(
        (name): name is string => Boolean(name)
      )
    )
  ];

  return {
    id: match.id,
    utcDate: match.utcDate,
    round: match.round,
    status: match.status,
    minute: match.minute,
    injuryTime: match.injuryTime,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeFlag: homeNation?.flag ?? '',
    awayFlag: awayNation?.flag ?? '',
    homeFlagImageUrl: homeNation?.flagImageUrl ?? '',
    awayFlagImageUrl: awayNation?.flagImageUrl ?? '',
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    winnerTeam: match.winnerTeam,
    homeParticipantName,
    awayParticipantName,
    participantNames
  };
}

function deriveEliminatedTeams(
  snapshot: WorldCupSnapshot,
  nations: Nation[]
): Set<string> {
  const eliminated = new Set<string>();
  const knownTeams = new Set(
    nations.map((nation) => normalizeTeamName(nation.name))
  );

  for (const match of snapshot.matches) {
    if (
      match.status !== 'finished' ||
      !match.winnerTeam ||
      match.round.startsWith('Group ')
    ) {
      continue;
    }

    const loser =
      normalizeTeamName(match.homeTeam) === normalizeTeamName(match.winnerTeam)
        ? match.awayTeam
        : match.homeTeam;

    if (knownTeams.has(normalizeTeamName(loser))) {
      eliminated.add(normalizeTeamName(loser));
    }
  }

  const groupEliminations = deriveCompletedGroupEliminations(
    snapshot.matches,
    nations
  );

  for (const team of groupEliminations) {
    eliminated.add(team);
  }

  return eliminated;
}

function deriveCompletedGroupEliminations(
  matches: Match[],
  nations: Nation[]
): Set<string> {
  const eliminated = new Set<string>();
  const groups = new Map<string, Nation[]>();

  for (const nation of nations) {
    groups.set(nation.group, [...(groups.get(nation.group) ?? []), nation]);
  }

  const completedThirdPlace: Array<{
    team: string;
    points: number;
    goalDifference: number;
    goalsFor: number;
  }> = [];
  let completedGroups = 0;

  for (const [group, groupNations] of groups) {
    const groupNames = new Set(
      groupNations.map((nation) => normalizeTeamName(nation.name))
    );
    const groupMatches = matches.filter(
      (match) =>
        match.round === group &&
        groupNames.has(normalizeTeamName(match.homeTeam)) &&
        groupNames.has(normalizeTeamName(match.awayTeam))
    );

    if (
      groupMatches.length !== 6 ||
      groupMatches.some((match) => match.status !== 'finished')
    ) {
      continue;
    }

    completedGroups += 1;
    const standings = rankGroup(groupMatches, groupNations);
    eliminated.add(normalizeTeamName(standings[3].team));
    completedThirdPlace.push(standings[2]);
  }

  if (completedGroups === groups.size) {
    const thirdPlaceRanked = [...completedThirdPlace].sort(
      (left, right) =>
        right.points - left.points ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor
    );

    for (const standing of thirdPlaceRanked.slice(8)) {
      eliminated.add(normalizeTeamName(standing.team));
    }
  }

  return eliminated;
}

function rankGroup(matches: Match[], nations: Nation[]) {
  const records = new Map(
    nations.map((nation) => [
      nation.name,
      {
        team: nation.name,
        points: 0,
        goalDifference: 0,
        goalsFor: 0
      }
    ])
  );

  for (const match of matches) {
    const home = records.get(match.homeTeam);
    const away = records.get(match.awayTeam);

    if (
      !home ||
      !away ||
      match.homeGoals === null ||
      match.awayGoals === null
    ) {
      continue;
    }

    home.goalsFor += match.homeGoals;
    away.goalsFor += match.awayGoals;
    home.goalDifference += match.homeGoals - match.awayGoals;
    away.goalDifference += match.awayGoals - match.homeGoals;

    if (match.homeGoals > match.awayGoals) {
      home.points += 3;
    } else if (match.awayGoals > match.homeGoals) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return [...records.values()].sort(
    (left, right) =>
      right.points - left.points ||
      right.goalDifference - left.goalDifference ||
      right.goalsFor - left.goalsFor
  );
}
