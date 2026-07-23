import { describe, expect, it } from 'vitest';
import {
  calculateSingleMatchPlayerLeaderboard,
  type PlayerAllocation
} from '../domain/playerSweep.js';

describe('single-match player sweep prizes', () => {
  const allocations: PlayerAllocation[] = [
    { participantName: 'Darcy', playerName: 'Player One' },
    { participantName: 'Joe', playerName: 'Player Two' },
    { participantName: 'Kathleen', playerName: 'Player Three' }
  ];

  it('awards first goal scorer and Norm Smith prizes to allocated players', () => {
    const leaderboard = calculateSingleMatchPlayerLeaderboard(
      allocations,
      { firstGoalScorerUsd: 400, normSmithMedalistUsd: 600 },
      { firstGoalScorer: 'Player One', normSmithMedalist: 'Player Two' }
    );

    expect(leaderboard[0]).toMatchObject({
      participantName: 'Joe',
      prizeUsd: 600
    });
    expect(leaderboard[1]).toMatchObject({
      participantName: 'Darcy',
      prizeUsd: 400
    });
  });

  it('awards both prizes when the same player wins both events', () => {
    const leaderboard = calculateSingleMatchPlayerLeaderboard(
      allocations,
      { firstGoalScorerUsd: 400, normSmithMedalistUsd: 600 },
      { firstGoalScorer: 'Player One', normSmithMedalist: 'Player One' }
    );

    expect(leaderboard[0]?.participantName).toBe('Darcy');
    expect(leaderboard[0]?.prizeUsd).toBe(1000);
    expect(leaderboard[0]?.prizeEvents.map((event) => event.label)).toEqual([
      'First goal scorer',
      'Norm Smith Medalist'
    ]);
  });
});
