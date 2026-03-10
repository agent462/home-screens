import type { Game } from './types';
import { TeamLogo, formatScore } from './shared';

export function TickerView({ games, speed }: { games: Game[]; speed: number }) {
  const duration = Math.max(1, games.length) * speed;

  const items = games.map((game) => (
    <span key={game.id} className="inline-flex items-center gap-1.5" style={{ fontSize: '0.85em' }}>
      <TeamLogo src={game.awayTeamLogo} alt={game.awayTeamAbbr} size={16} />
      <span className="font-semibold text-white/80">{game.awayTeamAbbr}</span>
      <span className="font-bold tabular-nums">{formatScore(game, game.awayScore)}</span>
      <span className="text-white/25 mx-0.5">&ndash;</span>
      <span className="font-bold tabular-nums">{formatScore(game, game.homeScore)}</span>
      <span className="font-semibold text-white/80">{game.homeTeamAbbr}</span>
      <TeamLogo src={game.homeTeamLogo} alt={game.homeTeamAbbr} size={16} />
      {game.state === 'in' && (
        <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
      )}
    </span>
  ));

  return (
    <div className="flex items-center h-full w-full overflow-hidden">
      <div
        className="flex w-max animate-ticker-scroll whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        <div className="flex gap-8 pr-8 shrink-0">{items}</div>
        <div className="flex gap-8 pr-8 shrink-0">{items}</div>
      </div>
    </div>
  );
}
