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
  relevantMatchCount?: number;
}

const fifteenSecondsMs = 15 * 1000;
const oneMinuteMs = 60 * 1000;
const fiveMinutesMs = 5 * oneMinuteMs;
const tenMinutesMs = 10 * oneMinuteMs;
const oneHourMs = 60 * oneMinuteMs;
const nominalMatchDurationMs = 2 * oneHourMs;
const postMatchWindowMs = oneHourMs;
const footballDataPreMatchWindowBeforeMs = 15 * oneMinuteMs;
const footballDataLiveWindowAfterMs = 125 * oneMinuteMs;
const footballDataFinalisationWindowAfterMs = 180 * oneMinuteMs;
const footballDataTargetCallsPerMinute = 18;
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

  async getFreshSnapshot(): Promise<WorldCupSnapshot> {
    if (!this.snapshot) {
      return this.refresh('full');
    }

    const decision = getPollingDecision(
      this.providerName,
      this.snapshot,
      this.now()
    );
    const updatedAt = new Date(this.snapshot.updatedAt).getTime();
    const ageMs = this.now().getTime() - updatedAt;

    if (Number.isNaN(updatedAt) || ageMs >= decision.intervalMs) {
      try {
        return await this.refresh(decision.mode);
      } catch (error: unknown) {
        console.error(formatPollingError(error));
        return this.snapshot;
      }
    }

    return this.snapshot;
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
    return getFootballDataPollingDecision(snapshot?.matches ?? [], now);
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

function getFootballDataPollingDecision(
  matches: Match[],
  now: Date
): PollDecision {
  const nowMs = now.getTime();
  const relevantMatches = matches.filter((match) =>
    isWithinFootballDataRelevantWindow(match, nowMs)
  );

  if (relevantMatches.length === 0) {
    return {
      intervalMs: tenMinutesMs,
      mode: 'full',
      reason: 'outside football-data live windows',
      relevantMatchCount: 0
    };
  }

  const liveMatches = relevantMatches.filter(
    (match) =>
      match.status === 'live' || isWithinFootballDataLiveWindow(match, nowMs)
  );
  const baseIntervalMs =
    liveMatches.length > 0 ? fifteenSecondsMs : oneMinuteMs;

  return {
    intervalMs: applyFootballDataCallBudget(
      baseIntervalMs,
      relevantMatches.length
    ),
    mode: 'relevant',
    reason:
      liveMatches.length > 0
        ? 'within football-data live window'
        : 'within football-data pre-match or finalisation window',
    relevantMatchCount: relevantMatches.length
  };
}

function isWithinFootballDataRelevantWindow(match: Match, nowMs: number) {
  if (match.status === 'finished') {
    return false;
  }

  const kickoff = new Date(match.utcDate).getTime();

  return (
    nowMs >= kickoff - footballDataPreMatchWindowBeforeMs &&
    nowMs <= kickoff + footballDataFinalisationWindowAfterMs
  );
}

function isWithinFootballDataLiveWindow(match: Match, nowMs: number) {
  if (match.status === 'finished') {
    return false;
  }

  const kickoff = new Date(match.utcDate).getTime();

  return nowMs >= kickoff && nowMs <= kickoff + footballDataLiveWindowAfterMs;
}

function applyFootballDataCallBudget(
  intervalMs: number,
  relevantMatchCount: number
): number {
  if (relevantMatchCount <= 0) {
    return intervalMs;
  }

  const minimumIntervalMs = Math.ceil(
    (relevantMatchCount * oneMinuteMs) / footballDataTargetCallsPerMinute
  );

  return Math.max(intervalMs, minimumIntervalMs);
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
