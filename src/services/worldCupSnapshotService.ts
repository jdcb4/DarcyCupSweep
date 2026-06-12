import type { Match, WorldCupSnapshot } from '../domain/sweep.js';
import type { WorldCupProvider } from './worldCupProvider.js';

export type ResultsProviderName =
  | 'football-data'
  | 'mock'
  | 'api-football'
  | 'openfootball';

export interface PollDecision {
  intervalMs: number;
  mode: 'full' | 'relevant';
  reason: string;
}

const oneMinuteMs = 60 * 1000;
const fiveMinutesMs = 5 * oneMinuteMs;
const tenMinutesMs = 10 * oneMinuteMs;
const oneHourMs = 60 * oneMinuteMs;
const nominalMatchDurationMs = 2 * oneHourMs;
const postMatchWindowMs = oneHourMs;
const footballDataFinishWindowStartMs = 85 * oneMinuteMs;
const footballDataFinishWindowEndMs = 110 * oneMinuteMs;
const apiFootballWindowBeforeMs = 15 * oneMinuteMs;
const apiFootballWindowAfterMs = 3 * oneHourMs;

export class WorldCupSnapshotService {
  private snapshot: WorldCupSnapshot | null = null;
  private refreshPromise: Promise<WorldCupSnapshot> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(
    private readonly provider: WorldCupProvider,
    private readonly providerName: ResultsProviderName,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getSnapshot(): Promise<WorldCupSnapshot> {
    if (this.snapshot) {
      return this.snapshot;
    }

    return this.refresh('full');
  }

  start(): void {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    void this.refresh('full')
      .catch((error: unknown) => {
        console.error(formatPollingError(error));
      })
      .finally(() => {
        this.scheduleNext();
      });
  }

  stop(): void {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getCachedSnapshot(): WorldCupSnapshot | null {
    return this.snapshot;
  }

  async refreshNow(): Promise<WorldCupSnapshot> {
    return this.refresh('full');
  }

  private scheduleNext(): void {
    if (this.stopped) {
      return;
    }

    const decision = getPollingDecision(
      this.providerName,
      this.snapshot,
      this.now()
    );

    this.timer = setTimeout(() => {
      void this.refresh(decision.mode)
        .catch((error: unknown) => {
          console.error(formatPollingError(error));
        })
        .finally(() => {
          this.scheduleNext();
        });
    }, decision.intervalMs);
  }

  private async refresh(mode: PollDecision['mode']): Promise<WorldCupSnapshot> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshSnapshot(mode).finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async refreshSnapshot(
    mode: PollDecision['mode']
  ): Promise<WorldCupSnapshot> {
    if (
      mode === 'relevant' &&
      this.snapshot &&
      this.provider.refreshRelevantSnapshot
    ) {
      this.snapshot = await this.provider.refreshRelevantSnapshot(
        this.snapshot,
        this.now()
      );
      return this.snapshot;
    }

    this.snapshot = await this.provider.getSnapshot();
    return this.snapshot;
  }
}

export function getPollingDecision(
  providerName: ResultsProviderName,
  snapshot: WorldCupSnapshot | null,
  now: Date
): PollDecision {
  if (providerName === 'openfootball') {
    return isWithinOpenFootballPostMatchWindow(snapshot?.matches ?? [], now)
      ? {
          intervalMs: fiveMinutesMs,
          mode: 'full',
          reason: 'within one hour after nominal match end'
        }
      : {
          intervalMs: oneHourMs,
          mode: 'full',
          reason: 'outside post-match update window'
        };
  }

  if (providerName === 'football-data') {
    return isWithinFootballDataFinishWindow(snapshot?.matches ?? [], now)
      ? {
          intervalMs: oneMinuteMs,
          mode: 'relevant',
          reason: 'within football-data likely result window'
        }
      : {
          intervalMs: tenMinutesMs,
          mode: 'full',
          reason: 'outside football-data likely result window'
        };
  }

  if (providerName === 'api-football') {
    return isWithinApiFootballMatchWindow(snapshot?.matches ?? [], now)
      ? {
          intervalMs: tenMinutesMs,
          mode: 'relevant',
          reason: `within ${providerName} match window`
        }
      : {
          intervalMs: oneHourMs,
          mode: 'full',
          reason: `outside ${providerName} match window`
        };
  }

  return {
    intervalMs: oneHourMs,
    mode: 'full',
    reason: 'mock provider'
  };
}

function isWithinOpenFootballPostMatchWindow(
  matches: Match[],
  now: Date
): boolean {
  const nowMs = now.getTime();

  return matches.some((match) => {
    const nominalEnd =
      new Date(match.utcDate).getTime() + nominalMatchDurationMs;
    return nowMs >= nominalEnd && nowMs <= nominalEnd + postMatchWindowMs;
  });
}

function isWithinFootballDataFinishWindow(
  matches: Match[],
  now: Date
): boolean {
  const nowMs = now.getTime();

  return matches.some((match) => {
    const kickoff = new Date(match.utcDate).getTime();
    return (
      nowMs >= kickoff + footballDataFinishWindowStartMs &&
      nowMs <= kickoff + footballDataFinishWindowEndMs
    );
  });
}

function isWithinApiFootballMatchWindow(matches: Match[], now: Date): boolean {
  const nowMs = now.getTime();

  return matches.some((match) => {
    const kickoff = new Date(match.utcDate).getTime();
    return (
      nowMs >= kickoff - apiFootballWindowBeforeMs &&
      nowMs <= kickoff + apiFootballWindowAfterMs
    );
  });
}

function formatPollingError(error: unknown): string {
  return error instanceof Error
    ? `World Cup provider polling failed: ${error.message}`
    : 'World Cup provider polling failed.';
}
