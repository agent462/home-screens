export { TeamLogo } from '../shared/TeamLogo';

export function isWinner(
  game: { state: string; homeScore: number; awayScore: number },
  side: 'home' | 'away',
): boolean {
  if (game.state !== 'post') return false;
  return side === 'home' ? game.homeScore > game.awayScore : game.awayScore > game.homeScore;
}

export function formatScore(game: { state: string }, score: number): string {
  return game.state === 'pre' ? '–' : String(score);
}

export function GameStatus({
  state,
  shortDetail,
  status,
  dotSize = 'w-1.5 h-1.5',
  fontSize,
  gap = 'gap-1',
  liveColor = 'text-green-400',
  postColor = 'text-white/40',
  preColor = 'text-white/60',
}: {
  state: string;
  shortDetail?: string;
  status: string;
  dotSize?: string;
  fontSize?: string;
  gap?: string;
  liveColor?: string;
  postColor?: string;
  preColor?: string;
}) {
  return (
    <div className={`flex items-center ${gap}`} style={fontSize ? { fontSize } : undefined}>
      {state === 'in' && (
        <span className={`${dotSize} rounded-full bg-green-400 animate-pulse`} />
      )}
      <span
        className={
          state === 'in'
            ? liveColor
            : state === 'post'
              ? postColor
              : preColor
        }
      >
        {shortDetail || status}
      </span>
    </div>
  );
}
