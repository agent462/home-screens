'use client';

import { useRotatingIndex } from '@/hooks/useRotatingIndex';
import type { StandingsGroup } from './types';
import { TeamLogo, formatRecord, getPlayoffTeamCount } from './shared';

interface CompactViewProps {
  groups: StandingsGroup[];
  teamsToShow: number;
  showPlayoffLine: boolean;
  rotationIntervalMs: number;
  grouping: 'division' | 'conference' | 'league';
}

export function CompactView({ groups, teamsToShow, showPlayoffLine, rotationIntervalMs, grouping }: CompactViewProps) {
  const index = useRotatingIndex(groups.length, rotationIntervalMs);
  const group = groups[index];

  if (!group) return null;

  const entries = teamsToShow > 0 ? group.entries.slice(0, teamsToShow) : group.entries;
  const playoffCount = getPlayoffTeamCount(group.league, grouping);
  const maxWinPct = Math.max(...entries.map((e) => e.winPct), 0.001);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold tracking-widest uppercase text-white/40"
            style={{ fontSize: '0.65em' }}
          >
            {group.league}
          </span>
          <span className="text-white/60 font-medium" style={{ fontSize: '0.75em' }}>
            {group.name}
          </span>
        </div>
        {groups.length > 1 && (
          groups.length <= 10 ? (
            <div className="flex gap-1">
              {groups.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === index ? 'bg-white/80' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="text-white/30 tabular-nums" style={{ fontSize: '0.6em' }}>
              {index + 1} / {groups.length}
            </span>
          )
        )}
      </div>

      {/* Team rows */}
      <div className="flex-1 overflow-hidden">
        {entries.map((entry) => {
          const barWidth = maxWinPct > 0 ? (entry.winPct / maxWinPct) * 100 : 0;
          const isPlayoffCutoff = showPlayoffLine && entry.rank === playoffCount;

          return (
            <div
              key={entry.teamAbbr}
              className={`relative flex items-center gap-2 py-0.5 px-2 ${
                isPlayoffCutoff ? 'border-b border-dashed border-white/20' : ''
              }`}
              style={{ borderLeft: `3px solid #${entry.teamColor}` }}
            >
              {/* Win pct background bar */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, #${entry.teamColor}10 0%, transparent ${barWidth}%)`,
                }}
              />

              {/* Rank */}
              <span
                className="text-white/30 tabular-nums shrink-0 relative"
                style={{ fontSize: '0.7em', width: '1.2em', textAlign: 'right' }}
              >
                {entry.rank}
              </span>

              {/* Logo */}
              <div className="shrink-0 relative">
                <TeamLogo src={entry.teamLogo} alt={entry.teamAbbr} size={16} />
              </div>

              {/* Team name */}
              <span className="flex-1 min-w-0 text-white/90 truncate font-medium relative" style={{ fontSize: '0.75em' }}>
                {entry.teamShort || entry.teamAbbr}
                {entry.clincher && (
                  <span className="text-emerald-400/70 ml-1" style={{ fontSize: '0.8em' }}>
                    {entry.clincher}
                  </span>
                )}
              </span>

              {/* Record */}
              <span className="text-white/60 tabular-nums shrink-0 relative" style={{ fontSize: '0.7em' }}>
                {formatRecord(entry, group.league)}
              </span>

              {/* Points (for NHL/soccer) */}
              {entry.points !== undefined && (
                <span className="text-white/80 tabular-nums font-semibold shrink-0 relative" style={{ fontSize: '0.7em', width: '2em', textAlign: 'right' }}>
                  {entry.points}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
