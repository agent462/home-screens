'use client';

import { useMemo } from 'react';
import type { SportsConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';
import { useRotatingIndex } from '@/hooks/useRotatingIndex';

interface SportsModuleProps {
  config: SportsConfig;
  style: ModuleStyle;
}

interface Game {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  startTime: string;
}

function statusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes('progress') || lower.includes('in ') || lower.includes('half') || lower.includes('period')) {
    return 'text-green-400';
  }
  if (lower.includes('final') || lower.includes('end')) {
    return 'text-white/40';
  }
  return 'text-white/70';
}

function LeagueRow({ league, games }: { league: string; games: Game[] }) {
  const index = useRotatingIndex(games.length, 8000);

  const game = games[index % games.length];
  if (!game) return null;

  return (
    <div className="flex items-center gap-2 w-full" style={{ minHeight: '1.8em' }}>
      <span
        className="font-bold uppercase tracking-wider opacity-50 shrink-0"
        style={{ fontSize: '0.75em', width: '2.5em' }}
      >
        {league}
      </span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="truncate text-right flex-1">{game.awayTeam}</span>
        <span className="font-bold tabular-nums shrink-0">
          {game.awayScore}–{game.homeScore}
        </span>
        <span className="truncate flex-1">{game.homeTeam}</span>
      </div>
      <span className={`shrink-0 ${statusColor(game.status)}`} style={{ fontSize: '0.75em' }}>
        {game.status}
      </span>
      {games.length > 1 && (
        <span className="opacity-30 shrink-0 tabular-nums" style={{ fontSize: '0.75em' }}>
          {(index % games.length) + 1}/{games.length}
        </span>
      )}
    </div>
  );
}

export default function SportsModule({ config, style }: SportsModuleProps) {
  const leagues = (config.leagues ?? ['nfl', 'nba']).join(',');
  const data = useFetchData<{ games: Game[] }>(
    `/api/sports?leagues=${encodeURIComponent(leagues)}`,
    config.refreshIntervalMs ?? 60000,
  );
  const games = data?.games ?? [];

  const gamesByLeague = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const game of games) {
      const existing = map.get(game.league) ?? [];
      existing.push(game);
      map.set(game.league, existing);
    }
    return map;
  }, [games]);

  if (games.length === 0) {
    return (
      <ModuleWrapper style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-center opacity-60">
            {data ? 'No games found' : 'Loading scores...'}
          </p>
        </div>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col justify-center h-full gap-2">
        {Array.from(gamesByLeague.entries()).map(([league, leagueGames]) => (
          <LeagueRow key={league} league={league} games={leagueGames} />
        ))}
      </div>
    </ModuleWrapper>
  );
}
