import { describe, expect, it } from 'vitest';
import { nations } from '../data/nations.js';
import {
  calculateLeaderboard,
  getActivationIssues,
  prizePoolUsd,
  type Sweep,
  type WorldCupSnapshot
} from '../domain/sweep.js';
import { buildSweepTracking } from '../domain/tracking.js';
import { parseOpenFootballMatches } from '../services/worldCupProvider.js';

const sweep: Sweep = {
  status: 'active',
  buyInUsd: 100,
  teamsPerParticipant: 3,
  prizesUsd: {
    champion: 800,
    runnerUp: 200,
    groupWinner: 50
  },
  participants: [
    { name: 'Darcy', teams: ['Argentina', 'Japan', 'Morocco'] },
    { name: 'Joe', teams: ['Brazil', 'USA', 'Canada'] },
    { name: 'Kathleen', teams: [] },
    { name: 'Joel', teams: [] },
    { name: 'Ed', teams: [] },
    { name: 'Lemmo', teams: [] },
    { name: 'Dave', teams: [] },
    { name: 'George', teams: [] },
    { name: 'Rachael', teams: [] },
    { name: 'Zach', teams: [] },
    { name: 'Emma', teams: [] },
    { name: 'Paul', teams: [] },
    { name: 'Louise', teams: [] },
    { name: 'Mitch', teams: [] },
    { name: 'Fraser', teams: [] },
    { name: 'Bree', teams: [] }
  ]
};

const snapshot: WorldCupSnapshot = {
  source: 'test',
  updatedAt: '2026-07-19T22:00:00.000Z',
  standings: [
    {
      teamName: 'Brazil',
      group: 'Group A',
      rank: 1,
      points: 9,
      played: 3,
      wins: 3,
      draws: 0,
      losses: 0,
      goalDifference: 5
    },
    {
      teamName: 'Canada',
      group: 'Group A',
      rank: 2,
      points: 0,
      played: 1,
      wins: 0,
      draws: 0,
      losses: 1,
      goalDifference: -5
    },
    {
      teamName: 'Argentina',
      group: 'Group B',
      rank: 1,
      points: 7,
      played: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      goalDifference: 4
    },
    {
      teamName: 'Japan',
      group: 'Group B',
      rank: 2,
      points: 1,
      played: 1,
      wins: 0,
      draws: 1,
      losses: 0,
      goalDifference: 0
    }
  ],
  matches: [
    {
      id: 'group-a',
      utcDate: '2026-06-20T00:00:00.000Z',
      round: 'Group A',
      status: 'finished',
      homeTeam: 'Brazil',
      awayTeam: 'Canada',
      homeGoals: 5,
      awayGoals: 0,
      winnerTeam: 'Brazil'
    },
    {
      id: 'group-b',
      utcDate: '2026-06-21T00:00:00.000Z',
      round: 'Group B',
      status: 'finished',
      homeTeam: 'Argentina',
      awayTeam: 'Japan',
      homeGoals: 1,
      awayGoals: 1,
      winnerTeam: null
    },
    {
      id: 'final',
      utcDate: '2026-07-19T22:00:00.000Z',
      round: 'Final',
      status: 'finished',
      homeTeam: 'Argentina',
      awayTeam: 'Brazil',
      homeGoals: 2,
      awayGoals: 1,
      winnerTeam: 'Argentina'
    }
  ]
};

describe('sweep domain', () => {
  it('calculates the total prize pool from participants and buy-in', () => {
    expect(prizePoolUsd(sweep)).toBe(1600);
  });

  it('allocates champion, runner-up, and group-winner prizes by participant team', () => {
    const leaderboard = calculateLeaderboard(sweep, snapshot);

    expect(leaderboard[0]).toMatchObject({
      participantName: 'Darcy',
      prizeUsd: 850
    });
    expect(leaderboard[1]).toMatchObject({
      participantName: 'Joe',
      prizeUsd: 250
    });
  });

  it('does not allocate group-winner prizes until a group is complete', () => {
    const leaderboard = calculateLeaderboard(
      {
        ...sweep,
        participants: sweep.participants.map((participant) =>
          participant.name === 'George'
            ? { ...participant, teams: ['Australia'] }
            : participant
        )
      },
      {
        source: 'test',
        updatedAt: '2026-06-12T00:00:00.000Z',
        standings: [
          {
            teamName: 'Australia',
            group: 'Group D',
            rank: 1,
            points: 3,
            played: 1,
            wins: 1,
            draws: 0,
            losses: 0,
            goalDifference: 2
          },
          {
            teamName: 'USA',
            group: 'Group D',
            rank: 2,
            points: 0,
            played: 1,
            wins: 0,
            draws: 0,
            losses: 1,
            goalDifference: -2
          },
          {
            teamName: 'Paraguay',
            group: 'Group D',
            rank: 3,
            points: 0,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalDifference: 0
          }
        ],
        matches: [
          {
            id: 'early-group-d',
            utcDate: '2026-06-12T00:00:00.000Z',
            round: 'Group D',
            status: 'finished',
            homeTeam: 'Australia',
            awayTeam: 'USA',
            homeGoals: 2,
            awayGoals: 0,
            winnerTeam: 'Australia'
          }
        ]
      }
    );

    expect(
      leaderboard.find((standing) => standing.participantName === 'George')
        ?.prizeUsd
    ).toBe(0);
  });

  it('requires exactly three unique teams per participant before activation', () => {
    const issues = getActivationIssues({
      ...sweep,
      participants: sweep.participants.map((participant, index) =>
        index === 1
          ? {
              ...participant,
              teams: ['Argentina', 'USA']
            }
          : participant
      )
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        'Joe needs exactly 3 teams.',
        'Duplicate teams are not allowed: argentina.',
        'Sweep needs 48 total teams before activation.'
      ])
    );
  });

  it('parses OpenFootball scheduled fixtures into UTC match records', () => {
    const matches = parseOpenFootballMatches(`
▪ Group A
Thu June 11
  13:00 UTC-6     Mexico       v South Africa        @ Mexico City
▪ Final
Sun Jul 19
  (104) 15:00 UTC-4    W101 v W102    @ New York/New Jersey (East Rutherford)
`);

    expect(matches).toEqual([
      {
        id: 'openfootball-group-a-6-11-13-00-mexico-south-africa',
        utcDate: '2026-06-11T19:00:00.000Z',
        round: 'Group A',
        status: 'scheduled',
        homeTeam: 'Mexico',
        awayTeam: 'South Africa',
        homeGoals: null,
        awayGoals: null,
        winnerTeam: null
      },
      {
        id: 'openfootball-104',
        utcDate: '2026-07-19T19:00:00.000Z',
        round: 'Final - New York/New Jersey (East Rutherford)',
        status: 'scheduled',
        homeTeam: 'W101',
        awayTeam: 'W102',
        homeGoals: null,
        awayGoals: null,
        winnerTeam: null
      }
    ]);
  });

  it('parses OpenFootball post-game scores and winners', () => {
    const matches = parseOpenFootballMatches(`
\u25aa Group D
Tue Nov 29
  22:00 UTC-5     Australia 2-1 (1-0) Denmark @ Dallas
  22:00 UTC-5     Tunisia 1-1 France @ Houston
`);

    expect(matches).toMatchObject([
      {
        status: 'finished',
        homeTeam: 'Australia',
        awayTeam: 'Denmark',
        homeGoals: 2,
        awayGoals: 1,
        winnerTeam: 'Australia'
      },
      {
        status: 'finished',
        homeTeam: 'Tunisia',
        awayTeam: 'France',
        homeGoals: 1,
        awayGoals: 1,
        winnerTeam: null
      }
    ]);
  });

  it('uses OpenFootball penalty results to resolve tied knockout winners', () => {
    const matches = parseOpenFootballMatches(`
\u25aa Round of 16
Mon Dec 5
  18:00 Japan 1-1 a.e.t (1-1, 1-0), 1-3 pen.
Croatia @ Al Janoub Stadium, Al Wakrah
`);

    expect(matches[0]).toMatchObject({
      status: 'finished',
      homeTeam: 'Japan',
      awayTeam: 'Croatia',
      homeGoals: 1,
      awayGoals: 1,
      winnerTeam: 'Croatia'
    });
  });

  it('tracks participant teams left, next matches, and match owners', () => {
    const tracking = buildSweepTracking(
      {
        ...sweep,
        participants: sweep.participants.map((participant) =>
          participant.name === 'Darcy'
            ? { ...participant, teams: ['Argentina', 'Australia', 'Brazil'] }
            : participant
        )
      },
      {
        source: 'test',
        updatedAt: '2026-06-20T00:00:00.000Z',
        standings: [],
        matches: [
          {
            id: 'ko',
            utcDate: '2026-07-01T00:00:00.000Z',
            round: 'Round of 32',
            status: 'finished',
            homeTeam: 'Argentina',
            awayTeam: 'Australia',
            homeGoals: 2,
            awayGoals: 0,
            winnerTeam: 'Argentina'
          },
          {
            id: 'next',
            utcDate: '2026-07-03T00:00:00.000Z',
            round: 'Quarter-final',
            status: 'scheduled',
            homeTeam: 'Argentina',
            awayTeam: 'Brazil',
            homeGoals: null,
            awayGoals: null,
            winnerTeam: null
          }
        ]
      },
      nations
    );

    const darcy = tracking.participants.find(
      (participant) => participant.participantName === 'Darcy'
    );

    expect(darcy?.teamsLeft).toBe(2);
    expect(darcy?.nextMatch?.id).toBe('next');
    expect(tracking.upcomingMatches[0]?.participantNames).toEqual([
      'Darcy',
      'Joe'
    ]);
    expect(tracking.upcomingMatches[0]?.homeParticipantName).toBe('Darcy');
    expect(tracking.upcomingMatches[0]?.awayParticipantName).toBe('Joe');
    expect(
      tracking.nations.find((team) => team.nation.name === 'Australia')?.status
    ).toBe('eliminated');
  });

  it('matches accented provider team names to unaccented stored allocations', () => {
    const tracking = buildSweepTracking(
      {
        ...sweep,
        participants: sweep.participants.map((participant) =>
          participant.name === 'Lemmo'
            ? { ...participant, teams: ['Germany'] }
            : participant.name === 'Emma'
              ? { ...participant, teams: ['Curacao'] }
              : participant
        )
      },
      {
        source: 'test',
        updatedAt: '2026-06-18T00:00:00.000Z',
        standings: [],
        matches: [
          {
            id: 'curacao',
            utcDate: '2026-06-18T00:00:00.000Z',
            round: 'Group E',
            status: 'scheduled',
            homeTeam: 'Germany',
            awayTeam: 'Cura\u00e7ao',
            homeGoals: null,
            awayGoals: null,
            winnerTeam: null
          }
        ]
      },
      nations
    );

    expect(tracking.upcomingMatches[0]?.homeParticipantName).toBe('Lemmo');
    expect(tracking.upcomingMatches[0]?.awayParticipantName).toBe('Emma');
    expect(tracking.upcomingMatches[0]?.participantNames).toEqual([
      'Lemmo',
      'Emma'
    ]);
    expect(tracking.upcomingMatches[0]?.awayFlagImageUrl).toContain('/cw.png');
    expect(
      tracking.participants.find(
        (participant) => participant.participantName === 'Emma'
      )?.nextMatch?.id
    ).toBe('curacao');
  });
});
