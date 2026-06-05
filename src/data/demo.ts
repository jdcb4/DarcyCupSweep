import { nations } from './nations.js';
import type { Match, Sweep, WorldCupSnapshot } from '../domain/sweep.js';

const participantNames = [
  'Darcy',
  'Joe',
  'Kathleen',
  'Joel',
  'Ed',
  'Lemmo',
  'Dave',
  'George',
  'Rachael',
  'Zach',
  'Emma',
  'Paul',
  'Louise',
  'Mitch',
  'Fraser',
  'Bree'
];

export const demoSweep: Sweep = {
  status: 'active',
  buyInUsd: 100,
  teamsPerParticipant: 3,
  prizesUsd: {
    champion: 800,
    runnerUp: 200,
    groupWinner: 50
  },
  participants: participantNames.map((name, index) => ({
    name,
    teams: nations.slice(index * 3, index * 3 + 3).map((nation) => nation.name)
  }))
};

const demoFixtures: Array<Omit<Match, 'status' | 'homeGoals' | 'awayGoals' | 'winnerTeam'>> = [
  fixture('demo-01', '2026-06-11T19:00:00.000Z', 'Group A', 'Mexico', 'South Africa'),
  fixture('demo-02', '2026-06-12T02:00:00.000Z', 'Group A', 'South Korea', 'Czech Republic'),
  fixture('demo-03', '2026-06-12T19:00:00.000Z', 'Group B', 'Canada', 'Bosnia & Herzegovina'),
  fixture('demo-04', '2026-06-13T01:00:00.000Z', 'Group D', 'USA', 'Paraguay'),
  fixture('demo-05', '2026-06-13T19:00:00.000Z', 'Group C', 'Brazil', 'Morocco'),
  fixture('demo-06', '2026-06-14T01:00:00.000Z', 'Group E', 'Germany', 'Ecuador'),
  fixture('demo-07', '2026-06-14T19:00:00.000Z', 'Group F', 'Netherlands', 'Japan'),
  fixture('demo-08', '2026-06-15T01:00:00.000Z', 'Group G', 'Belgium', 'Egypt'),
  fixture('demo-09', '2026-06-15T19:00:00.000Z', 'Group H', 'Spain', 'Cape Verde'),
  fixture('demo-10', '2026-06-16T01:00:00.000Z', 'Group I', 'France', 'Senegal'),
  fixture('demo-11', '2026-06-16T19:00:00.000Z', 'Group J', 'Argentina', 'Algeria'),
  fixture('demo-12', '2026-06-17T01:00:00.000Z', 'Group K', 'Portugal', 'DR Congo'),
  fixture('demo-13', '2026-06-17T19:00:00.000Z', 'Group L', 'England', 'Croatia'),
  fixture('demo-14', '2026-06-18T01:00:00.000Z', 'Group B', 'Qatar', 'Switzerland'),
  fixture('demo-15', '2026-06-18T19:00:00.000Z', 'Group C', 'Haiti', 'Scotland'),
  fixture('demo-16', '2026-06-19T01:00:00.000Z', 'Group D', 'Australia', 'Turkey')
];

const demoScores = [
  [2, 1],
  [1, 1],
  [0, 2],
  [3, 1],
  [2, 0],
  [4, 1],
  [1, 2],
  [2, 2],
  [3, 0],
  [1, 0],
  [2, 1],
  [0, 1]
] as const;

export const demoNoResultsSnapshot: WorldCupSnapshot = {
  source: 'demo-no-results',
  updatedAt: '2026-06-11T18:00:00.000Z',
  standings: [],
  matches: demoFixtures.map((match) => ({
    ...match,
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    winnerTeam: null
  }))
};

export const demoFirstDozenResultsSnapshot: WorldCupSnapshot = {
  source: 'demo-first-dozen-results',
  updatedAt: '2026-06-17T03:00:00.000Z',
  standings: [],
  matches: demoFixtures.map((match, index) => {
    const score = demoScores[index];

    if (!score) {
      return {
        ...match,
        status: 'scheduled',
        homeGoals: null,
        awayGoals: null,
        winnerTeam: null
      };
    }

    const [homeGoals, awayGoals] = score;

    return {
      ...match,
      status: 'finished',
      homeGoals,
      awayGoals,
      winnerTeam: homeGoals > awayGoals ? match.homeTeam : awayGoals > homeGoals ? match.awayTeam : null
    };
  })
};

function fixture(id: string, utcDate: string, round: string, homeTeam: string, awayTeam: string) {
  return {
    id,
    utcDate,
    round,
    homeTeam,
    awayTeam
  };
}
