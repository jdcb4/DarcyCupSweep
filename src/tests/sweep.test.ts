import { describe, expect, it } from 'vitest';
import { calculateLeaderboard, getActivationIssues, prizePoolUsd, type Sweep, type WorldCupSnapshot } from '../domain/sweep.js';

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
      teamName: 'Argentina',
      group: 'Group B',
      rank: 1,
      points: 7,
      played: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      goalDifference: 4
    }
  ],
  matches: [
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
});
