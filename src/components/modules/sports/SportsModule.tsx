'use client';

import type { SportsConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from '../ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';
import { ScoreboardView } from './ScoreboardView';
import { CardsView } from './CardsView';
import { ListView } from './ListView';
import { TickerView } from './TickerView';
import type { Game } from './types';

interface SportsModuleProps {
  config: SportsConfig;
  style: ModuleStyle;
}

export default function SportsModule({ config, style }: SportsModuleProps) {
  const leagues = (config.leagues ?? ['nfl', 'nba']).join(',');
  const data = useFetchData<{ games: Game[] }>(
    `/api/sports?leagues=${encodeURIComponent(leagues)}`,
    config.refreshIntervalMs ?? 60000,
  );
  const games = data?.games ?? [];
  const view = config.view ?? 'scoreboard';

  if (data === null) {
    return (
      <ModuleWrapper style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-center opacity-50">Loading scores…</p>
        </div>
      </ModuleWrapper>
    );
  }

  if (games.length === 0) {
    return (
      <ModuleWrapper style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-center opacity-60">No games found</p>
        </div>
      </ModuleWrapper>
    );
  }

  return (
    <ModuleWrapper style={style}>
      {view === 'scoreboard' && <ScoreboardView games={games} />}
      {view === 'cards' && <CardsView games={games} />}
      {view === 'list' && <ListView games={games} />}
      {view === 'ticker' && <TickerView games={games} speed={config.tickerSpeed ?? 4} />}
    </ModuleWrapper>
  );
}
