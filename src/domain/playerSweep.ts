export interface PlayerAllocation {
  participantName: string;
  playerName: string;
}

export interface SingleMatchPlayerPrizeRules {
  firstGoalScorerUsd: number;
  normSmithMedalistUsd: number;
}

export interface SingleMatchPlayerResult {
  firstGoalScorer: string | null;
  normSmithMedalist: string | null;
}

export interface PlayerPrizeEvent {
  participantName: string;
  playerName: string;
  label: 'First goal scorer' | 'Norm Smith Medalist';
  amountUsd: number;
}

export interface PlayerSweepStanding {
  participantName: string;
  prizeUsd: number;
  prizeEvents: PlayerPrizeEvent[];
}

export function calculateSingleMatchPlayerPrizeEvents(
  allocations: PlayerAllocation[],
  rules: SingleMatchPlayerPrizeRules,
  result: SingleMatchPlayerResult
): PlayerPrizeEvent[] {
  return [
    ...getPlayerPrizeEvent(
      allocations,
      result.firstGoalScorer,
      'First goal scorer',
      rules.firstGoalScorerUsd
    ),
    ...getPlayerPrizeEvent(
      allocations,
      result.normSmithMedalist,
      'Norm Smith Medalist',
      rules.normSmithMedalistUsd
    )
  ];
}

export function calculateSingleMatchPlayerLeaderboard(
  allocations: PlayerAllocation[],
  rules: SingleMatchPlayerPrizeRules,
  result: SingleMatchPlayerResult
): PlayerSweepStanding[] {
  const participants = [
    ...new Set(allocations.map((allocation) => allocation.participantName))
  ];
  const prizeEvents = calculateSingleMatchPlayerPrizeEvents(
    allocations,
    rules,
    result
  );

  return participants
    .map((participantName) => {
      const participantEvents = prizeEvents.filter(
        (event) => event.participantName === participantName
      );

      return {
        participantName,
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

function getPlayerPrizeEvent(
  allocations: PlayerAllocation[],
  playerName: string | null,
  label: PlayerPrizeEvent['label'],
  amountUsd: number
): PlayerPrizeEvent[] {
  if (!playerName || amountUsd <= 0) {
    return [];
  }

  const allocation = allocations.find(
    (candidate) =>
      normalizePlayerName(candidate.playerName) ===
      normalizePlayerName(playerName)
  );

  if (!allocation) {
    return [];
  }

  return [
    {
      participantName: allocation.participantName,
      playerName: allocation.playerName,
      label,
      amountUsd
    }
  ];
}

function normalizePlayerName(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}
