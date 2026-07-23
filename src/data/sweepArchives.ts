export interface ArchivedEntryOutcome {
  name: string;
  code: string;
  outcome: string;
  prizeUsd: number;
  prizeReasons: string[];
}

export interface ArchivedParticipantOutcome {
  participantName: string;
  totalPrizeUsd: number;
  entries: ArchivedEntryOutcome[];
}

export interface ArchivedSweepOutcome {
  slug: string;
  name: string;
  displayDate: string;
  sweepType: string;
  prizePoolUsd: number;
  prizeRules: string[];
  winnerSummary: string;
  participants: ArchivedParticipantOutcome[];
}

export const archivedSweeps: ArchivedSweepOutcome[] = [
  {
    slug: '2026-football-world-cup',
    name: '2026 Football World Cup',
    displayDate: '12 June - 19 July 2026',
    sweepType: 'Tournament teams',
    prizePoolUsd: 1600,
    prizeRules: ['$800 champion', '$200 runner-up', '$50 per group winner'],
    winnerSummary: 'Mitch won $850 with Spain',
    participants: [
      {
        participantName: 'Mitch',
        totalPrizeUsd: 850,
        entries: [
          outcome('Norway', 'NOR', 'Quarter-final'),
          outcome('Spain', 'ESP', 'Champion', 850, [
            'Group winner',
            'Champion'
          ]),
          outcome('Sweden', 'SWE', 'Round of 32')
        ]
      },
      {
        participantName: 'Zach',
        totalPrizeUsd: 250,
        entries: [
          outcome('Argentina', 'ARG', 'Runner-up', 250, [
            'Group winner',
            'Runner-up'
          ]),
          outcome('DR Congo', 'COD', 'Round of 32'),
          outcome('Uruguay', 'URY', 'Group stage')
        ]
      },
      {
        participantName: 'Dave',
        totalPrizeUsd: 100,
        entries: [
          outcome('France', 'FRA', 'Third place playoff', 50, ['Group winner']),
          outcome('Switzerland', 'SUI', 'Quarter-final', 50, ['Group winner']),
          outcome('Uzbekistan', 'UZB', 'Group stage')
        ]
      },
      {
        participantName: 'Joe',
        totalPrizeUsd: 100,
        entries: [
          outcome('Colombia', 'COL', 'Round of 16', 50, ['Group winner']),
          outcome('Netherlands', 'NED', 'Round of 32', 50, ['Group winner']),
          outcome('Scotland', 'SCO', 'Group stage')
        ]
      },
      {
        participantName: 'Lemmo',
        totalPrizeUsd: 100,
        entries: [
          outcome('Germany', 'GER', 'Round of 32', 50, ['Group winner']),
          outcome('Mexico', 'MEX', 'Round of 16', 50, ['Group winner']),
          outcome('Senegal', 'SEN', 'Round of 32')
        ]
      },
      {
        participantName: 'Joel',
        totalPrizeUsd: 50,
        entries: [
          outcome('England', 'ENG', 'Third place playoff', 50, [
            'Group winner'
          ]),
          outcome('Iran', 'IRN', 'Group stage'),
          outcome('Japan', 'JPN', 'Round of 32')
        ]
      },
      {
        participantName: 'Kathleen',
        totalPrizeUsd: 50,
        entries: [
          outcome('Belgium', 'BEL', 'Quarter-final', 50, ['Group winner']),
          outcome('Bosnia & Herzegovina', 'BIH', 'Round of 32'),
          outcome('Haiti', 'HAI', 'Group stage')
        ]
      },
      {
        participantName: 'Louise',
        totalPrizeUsd: 50,
        entries: [
          outcome('Iraq', 'IRQ', 'Group stage'),
          outcome('South Korea', 'KOR', 'Group stage'),
          outcome('USA', 'USA', 'Round of 16', 50, ['Group winner'])
        ]
      },
      {
        participantName: 'Paul',
        totalPrizeUsd: 50,
        entries: [
          outcome('Brazil', 'BRA', 'Round of 16', 50, ['Group winner']),
          outcome('Ghana', 'GHA', 'Round of 32'),
          outcome('Qatar', 'QAT', 'Group stage')
        ]
      },
      {
        participantName: 'Bree',
        totalPrizeUsd: 0,
        entries: [
          outcome('Croatia', 'CRO', 'Round of 32'),
          outcome('Morocco', 'MAR', 'Quarter-final'),
          outcome('Paraguay', 'PAR', 'Round of 16')
        ]
      },
      {
        participantName: 'Darcy',
        totalPrizeUsd: 0,
        entries: [
          outcome('Austria', 'AUT', 'Round of 32'),
          outcome('Cape Verde', 'CPV', 'Round of 32'),
          outcome('Jordan', 'JOR', 'Group stage')
        ]
      },
      {
        participantName: 'Ed',
        totalPrizeUsd: 0,
        entries: [
          outcome('Czech Republic', 'CZE', 'Group stage'),
          outcome('Ivory Coast', 'CIV', 'Round of 32'),
          outcome('Tunisia', 'TUN', 'Group stage')
        ]
      },
      {
        participantName: 'Emma',
        totalPrizeUsd: 0,
        entries: [
          outcome('Canada', 'CAN', 'Round of 16'),
          outcome('Curacao', 'CUW', 'Group stage'),
          outcome('Egypt', 'EGY', 'Round of 16')
        ]
      },
      {
        participantName: 'Fraser',
        totalPrizeUsd: 0,
        entries: [
          outcome('New Zealand', 'NZL', 'Group stage'),
          outcome('Panama', 'PAN', 'Group stage'),
          outcome('South Africa', 'RSA', 'Round of 32')
        ]
      },
      {
        participantName: 'George',
        totalPrizeUsd: 0,
        entries: [
          outcome('Algeria', 'ALG', 'Round of 32'),
          outcome('Australia', 'AUS', 'Round of 32'),
          outcome('Saudi Arabia', 'KSA', 'Group stage')
        ]
      },
      {
        participantName: 'Rachael',
        totalPrizeUsd: 0,
        entries: [
          outcome('Ecuador', 'ECU', 'Round of 32'),
          outcome('Portugal', 'POR', 'Round of 16'),
          outcome('Turkey', 'TUR', 'Group stage')
        ]
      }
    ]
  }
];

export function getArchivedSweep(
  slug: string
): ArchivedSweepOutcome | undefined {
  return archivedSweeps.find((sweep) => sweep.slug === slug);
}

function outcome(
  name: string,
  code: string,
  result: string,
  prizeUsd = 0,
  prizeReasons: string[] = []
): ArchivedEntryOutcome {
  return {
    name,
    code,
    outcome: result,
    prizeUsd,
    prizeReasons
  };
}
