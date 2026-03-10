'use client';

import { useRotatingIndex } from '@/hooks/useRotatingIndex';
import type { Game } from './types';
import { TeamLogo, isWinner, formatScore } from './shared';

function TeamRow({
  logo,
  abbr,
  record,
  score,
  winner,
  color,
}: {
  logo: string;
  abbr: string;
  record: string;
  score: string;
  winner: boolean;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="rounded-lg p-1.5 shrink-0" style={{ backgroundColor: `#${color}15` }}>
        <TeamLogo src={logo} alt={abbr} size={36} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`font-bold truncate ${winner ? 'text-white' : 'text-white/70'}`}
          style={{ fontSize: '1.05em' }}
        >
          {abbr}
        </div>
        {record && (
          <div className="text-white/35 truncate" style={{ fontSize: '0.65em' }}>
            {record}
          </div>
        )}
      </div>
      <div
        className={`font-bold tabular-nums ${winner ? 'text-white' : 'text-white/60'}`}
        style={{ fontSize: '1.6em' }}
      >
        {score}
      </div>
    </div>
  );
}

export function ScoreboardView({ games }: { games: Game[] }) {
  const index = useRotatingIndex(games.length, 10000);
  const game = games[index];

  if (!game) return null;

  return (
    <div className="flex flex-col justify-center h-full gap-3 px-4">
      {/* League + broadcast */}
      <div className="flex items-center justify-between">
        <span
          className="font-semibold tracking-widest uppercase text-white/40"
          style={{ fontSize: '0.65em' }}
        >
          {game.league}
        </span>
        {game.broadcast && (
          <span className="text-white/30" style={{ fontSize: '0.6em' }}>
            {game.broadcast}
          </span>
        )}
      </div>

      {/* Away team */}
      <TeamRow
        logo={game.awayTeamLogo}
        abbr={game.awayTeamAbbr}
        record={game.awayRecord}
        score={formatScore(game, game.awayScore)}
        winner={isWinner(game, 'away')}
        color={game.awayTeamColor}
      />

      <div className="h-px bg-white/10" />

      {/* Home team */}
      <TeamRow
        logo={game.homeTeamLogo}
        abbr={game.homeTeamAbbr}
        record={game.homeRecord}
        score={formatScore(game, game.homeScore)}
        winner={isWinner(game, 'home')}
        color={game.homeTeamColor}
      />

      {/* Status + pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5" style={{ fontSize: '0.7em' }}>
          {game.state === 'in' && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
          <span
            className={
              game.state === 'in'
                ? 'text-green-400'
                : game.state === 'post'
                  ? 'text-white/40'
                  : 'text-white/60'
            }
          >
            {game.shortDetail || game.status}
          </span>
        </div>
        {games.length > 1 &&
          (games.length <= 12 ? (
            <div className="flex gap-1">
              {games.map((_, i) => (
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
              {index + 1} / {games.length}
            </span>
          ))}
      </div>
    </div>
  );
}
