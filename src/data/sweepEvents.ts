export type SweepEventStatus = 'planned' | 'active' | 'completed';
export type SweepEventKind = 'football-tournament' | 'australian-rules-final';
export type ResultEntryMode = 'api' | 'manual';
export type AppSweepMode = 'between_sweeps' | 'setup' | 'active' | 'completed';
export type SweepTemplateId =
  | 'football_tournament_team'
  | 'single_match_player';

export interface SweepTemplate {
  id: SweepTemplateId;
  name: string;
  entryLabel: string;
  resultEntryMode: ResultEntryMode;
  prizeEvents: string[];
  expectedEntryCount?: number;
}

export interface SweepEvent {
  slug: string;
  name: string;
  shortName: string;
  kind: SweepEventKind;
  status: SweepEventStatus;
  startsAtIso: string | null;
  displayDate: string;
  publicPath: string;
  resultEntryMode: ResultEntryMode;
  templateId: SweepTemplateId;
  sweepType: string;
  resultSummary?: string;
}

export const appSweepMode: AppSweepMode = 'between_sweeps';
export const currentSweepSlug: string | null = null;

export const sweepTemplates: SweepTemplate[] = [
  {
    id: 'football_tournament_team',
    name: 'Football tournament team sweep',
    entryLabel: 'Country',
    resultEntryMode: 'api',
    prizeEvents: ['Group winner', 'Runner-up', 'Champion']
  },
  {
    id: 'single_match_player',
    name: 'Single-match player sweep',
    entryLabel: 'Player',
    resultEntryMode: 'manual',
    prizeEvents: ['First goal scorer', 'Norm Smith Medalist'],
    expectedEntryCount: 46
  }
];

export const sweepEvents: SweepEvent[] = [
  {
    slug: '2026-football-world-cup',
    name: '2026 Football World Cup',
    shortName: 'World Cup 2026',
    kind: 'football-tournament',
    status: 'completed',
    startsAtIso: '2026-06-12T00:00:00.000Z',
    displayDate: '12 June - 19 July 2026',
    publicPath: '/sweeps/2026-football-world-cup',
    resultEntryMode: 'api',
    templateId: 'football_tournament_team',
    sweepType: 'Tournament teams',
    resultSummary: 'Full results are available from the live sweep data.'
  },
  {
    slug: '2026-afl-grand-final',
    name: '2026 AFL Grand Final',
    shortName: 'AFL Grand Final',
    kind: 'australian-rules-final',
    status: 'planned',
    startsAtIso: '2026-09-26T04:30:00.000Z',
    displayDate: 'Saturday 26 September 2026, 2:30 pm AEST',
    publicPath: '/sweeps/2026-afl-grand-final',
    resultEntryMode: 'manual',
    templateId: 'single_match_player',
    sweepType: 'Individual players'
  },
  {
    slug: '2027-womens-fifa-world-cup',
    name: "2027 Women's FIFA World Cup",
    shortName: "Women's World Cup 2027",
    kind: 'football-tournament',
    status: 'planned',
    startsAtIso: '2027-06-24T00:00:00.000Z',
    displayDate: '24 June - 25 July 2027',
    publicPath: '/sweeps/2027-womens-fifa-world-cup',
    resultEntryMode: 'api',
    templateId: 'football_tournament_team',
    sweepType: 'Tournament teams'
  }
];

export function getNextSweep(now = new Date()): SweepEvent | null {
  const currentTime = now.getTime();
  const dated = sweepEvents
    .filter(
      (event) =>
        event.status === 'planned' &&
        event.startsAtIso !== null &&
        new Date(event.startsAtIso).getTime() > currentTime
    )
    .sort(
      (left, right) =>
        new Date(left.startsAtIso ?? 0).getTime() -
        new Date(right.startsAtIso ?? 0).getTime()
    );

  return (
    dated[0] ?? sweepEvents.find((event) => event.status === 'planned') ?? null
  );
}

export function getCompletedSweeps(): SweepEvent[] {
  return sweepEvents.filter((event) => event.status === 'completed');
}

export function getPlannedSweeps(): SweepEvent[] {
  return sweepEvents.filter((event) => event.status === 'planned');
}
