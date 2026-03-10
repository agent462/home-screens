/* eslint-disable @next/next/no-img-element */

export function TeamLogo({ src, alt, size = 24 }: { src: string; alt: string; size?: number }) {
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
