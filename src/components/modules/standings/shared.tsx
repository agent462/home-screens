import type { StandingsEntry } from './types';
import { PaginationDots } from '../shared/PaginationDots';

export { TeamLogo } from '../shared/TeamLogo';

export function formatRecord(entry: StandingsEntry, league: string): string {
  const l = league.toLowerCase();
  if (l === 'nhl') {
    return `${entry.wins}-${entry.losses}${entry.otLosses ? `-${entry.otLosses}` : ''}`;
  }
  if (['mls', 'epl', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'liga_mx'].includes(l)) {
    return `${entry.wins}-${entry.draws ?? 0}-${entry.losses}`;
  }
  if (l === 'nfl') {
    return entry.ties ? `${entry.wins}-${entry.losses}-${entry.ties}` : `${entry.wins}-${entry.losses}`;
  }
  return `${entry.wins}-${entry.losses}`;
}

export function getPlayoffTeamCount(league: string, grouping: 'division' | 'conference' | 'league' = 'conference'): number {
  const l = league.toLowerCase();
  const perConf = (() => {
    switch (l) {
      case 'nfl': return 7;
      case 'nba': return 10;
      case 'wnba': return 8;
      case 'mlb': return 6;
      case 'nhl': return 8;
      default: return 0;
    }
  })();
  // Double for two-conference leagues when viewing full league standings
  const twoConference = ['nfl', 'nba', 'mlb', 'nhl'];
  if (grouping === 'league' && twoConference.includes(l)) return perConf * 2;
  return perConf;
}

const SOCCER_LEAGUES = ['mls', 'epl', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'liga_mx'];

export function isSoccer(league: string): boolean {
  return SOCCER_LEAGUES.includes(league.toLowerCase());
}

export function StandingsHeader({
  league,
  groupName,
  total,
  current,
}: {
  league: string;
  groupName: string;
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-white/10">
      <div className="flex items-center gap-2">
        <span
          className="font-semibold tracking-widest uppercase text-white/40"
          style={{ fontSize: '0.65em' }}
        >
          {league}
        </span>
        <span className="text-white/60 font-medium" style={{ fontSize: '0.75em' }}>
          {groupName}
        </span>
      </div>
      <PaginationDots total={total} current={current} />
    </div>
  );
}
