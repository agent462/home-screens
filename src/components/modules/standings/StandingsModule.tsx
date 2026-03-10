'use client';

import type { StandingsConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from '../ModuleWrapper';
import { useFetchData } from '@/hooks/useFetchData';
import { TableView } from './TableView';
import { CompactView } from './CompactView';
import { ConferenceView } from './ConferenceView';
import type { StandingsGroup } from './types';

interface StandingsModuleProps {
  config: StandingsConfig;
  style: ModuleStyle;
}

export default function StandingsModule({ config, style }: StandingsModuleProps) {
  const league = config.league ?? 'nfl';
  const grouping = config.grouping ?? 'division';
  const view = config.view ?? 'table';

  const data = useFetchData<{ groups: StandingsGroup[] }>(
    `/api/standings?league=${encodeURIComponent(league)}&grouping=${encodeURIComponent(grouping)}`,
    config.refreshIntervalMs ?? 300000,
  );

  const groups = data?.groups ?? [];

  if (data === null) {
    return (
      <ModuleWrapper style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-center opacity-50">Loading standings…</p>
        </div>
      </ModuleWrapper>
    );
  }

  if (groups.length === 0) {
    return (
      <ModuleWrapper style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-center opacity-60">No standings available</p>
        </div>
      </ModuleWrapper>
    );
  }

  const teamsToShow = config.teamsToShow ?? 0;
  const showPlayoffLine = config.showPlayoffLine ?? true;
  const rotationIntervalMs = config.rotationIntervalMs ?? 10000;

  return (
    <ModuleWrapper style={style}>
      {view === 'table' && (
        <TableView
          groups={groups}
          teamsToShow={teamsToShow}
          showPlayoffLine={showPlayoffLine}
          rotationIntervalMs={rotationIntervalMs}
          grouping={grouping}
        />
      )}
      {view === 'compact' && (
        <CompactView
          groups={groups}
          teamsToShow={teamsToShow}
          showPlayoffLine={showPlayoffLine}
          rotationIntervalMs={rotationIntervalMs}
          grouping={grouping}
        />
      )}
      {view === 'conference' && (
        <ConferenceView
          groups={groups}
          teamsToShow={teamsToShow}
          showPlayoffLine={showPlayoffLine}
          rotationIntervalMs={rotationIntervalMs}
          grouping={grouping}
        />
      )}
    </ModuleWrapper>
  );
}
