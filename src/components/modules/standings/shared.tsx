/* eslint-disable @next/next/no-img-element */

import type { StandingsEntry } from './types';

export function TeamLogo({ src, alt, size = 20 }: { src: string; alt: string; size?: number }) {
  if (!src) return <div style={{ width: size, height: size }} className="shrink-0" />;
  return (
    <img
      src={`/api/image-proxy?url=${encodeURIComponent(src)}`}
      alt={alt}
      width={size}
      height={size}
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.opacity = '0';
      }}
    />
  );
}

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
