export interface Nation {
  name: string;
  group: string;
  flag: string;
  code: string;
  flagImageUrl: string;
}

export const nations: Nation[] = [
  nation('Mexico', 'Group A', 'MEX', 'mx'),
  nation('South Africa', 'Group A', 'RSA', 'za'),
  nation('South Korea', 'Group A', 'KOR', 'kr'),
  nation('Czech Republic', 'Group A', 'CZE', 'cz'),
  nation('Canada', 'Group B', 'CAN', 'ca'),
  nation('Bosnia & Herzegovina', 'Group B', 'BIH', 'ba'),
  nation('Qatar', 'Group B', 'QAT', 'qa'),
  nation('Switzerland', 'Group B', 'SUI', 'ch'),
  nation('Brazil', 'Group C', 'BRA', 'br'),
  nation('Morocco', 'Group C', 'MAR', 'ma'),
  nation('Haiti', 'Group C', 'HAI', 'ht'),
  nation('Scotland', 'Group C', 'SCO', 'gb-sct'),
  nation('USA', 'Group D', 'USA', 'us'),
  nation('Paraguay', 'Group D', 'PAR', 'py'),
  nation('Australia', 'Group D', 'AUS', 'au'),
  nation('Turkey', 'Group D', 'TUR', 'tr'),
  nation('Germany', 'Group E', 'GER', 'de'),
  nation('Curacao', 'Group E', 'CUW', 'cw'),
  nation('Ivory Coast', 'Group E', 'CIV', 'ci'),
  nation('Ecuador', 'Group E', 'ECU', 'ec'),
  nation('Netherlands', 'Group F', 'NED', 'nl'),
  nation('Japan', 'Group F', 'JPN', 'jp'),
  nation('Sweden', 'Group F', 'SWE', 'se'),
  nation('Tunisia', 'Group F', 'TUN', 'tn'),
  nation('Belgium', 'Group G', 'BEL', 'be'),
  nation('Egypt', 'Group G', 'EGY', 'eg'),
  nation('Iran', 'Group G', 'IRN', 'ir'),
  nation('New Zealand', 'Group G', 'NZL', 'nz'),
  nation('Spain', 'Group H', 'ESP', 'es'),
  nation('Cape Verde', 'Group H', 'CPV', 'cv'),
  nation('Saudi Arabia', 'Group H', 'KSA', 'sa'),
  nation('Uruguay', 'Group H', 'URY', 'uy'),
  nation('France', 'Group I', 'FRA', 'fr'),
  nation('Senegal', 'Group I', 'SEN', 'sn'),
  nation('Iraq', 'Group I', 'IRQ', 'iq'),
  nation('Norway', 'Group I', 'NOR', 'no'),
  nation('Argentina', 'Group J', 'ARG', 'ar'),
  nation('Algeria', 'Group J', 'ALG', 'dz'),
  nation('Austria', 'Group J', 'AUT', 'at'),
  nation('Jordan', 'Group J', 'JOR', 'jo'),
  nation('Portugal', 'Group K', 'POR', 'pt'),
  nation('DR Congo', 'Group K', 'COD', 'cd'),
  nation('Uzbekistan', 'Group K', 'UZB', 'uz'),
  nation('Colombia', 'Group K', 'COL', 'co'),
  nation('England', 'Group L', 'ENG', 'gb-eng'),
  nation('Croatia', 'Group L', 'CRO', 'hr'),
  nation('Ghana', 'Group L', 'GHA', 'gh'),
  nation('Panama', 'Group L', 'PAN', 'pa')
];

function nation(
  name: string,
  group: string,
  code: string,
  flagCode: string
): Nation {
  return {
    name,
    group,
    flag: '',
    code,
    flagImageUrl: `https://flagcdn.com/w80/${flagCode}.png`
  };
}
