export interface Game {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeTeamColor: string;
  awayTeamColor: string;
  homeScore: number;
  awayScore: number;
  homeRecord: string;
  awayRecord: string;
  status: string;
  detail: string;
  shortDetail: string;
  state: 'pre' | 'in' | 'post';
  startTime: string;
  broadcast: string;
}
