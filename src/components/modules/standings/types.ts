export interface StandingsEntry {
  rank: number;
  team: string;
  teamAbbr: string;
  teamShort: string;
  teamLogo: string;
  teamColor: string;
  wins: number;
  losses: number;
  ties?: number;
  otLosses?: number;
  draws?: number;
  points?: number;
  winPct: number;
  gamesBack?: number;
  streak?: string;
  clincher?: string;
  playoffSeed?: number;
  gamesPlayed?: number;
  last10?: string;
  pointsFor?: number;
  pointsAgainst?: number;
  differential?: number;
  homeRecord?: string;
  awayRecord?: string;
  divRecord?: string;
  goalDiff?: number;
}

export interface StandingsGroup {
  name: string;
  league: string;
  entries: StandingsEntry[];
}
