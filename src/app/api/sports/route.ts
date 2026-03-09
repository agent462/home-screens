import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, createTTLCache } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

interface GameResult {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  startTime: string;
}

const cache = createTTLCache<unknown>(60_000);

const LEAGUE_MAP: Record<string, string> = {
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  mlb: 'baseball/mlb',
  nhl: 'hockey/nhl',
  mls: 'soccer/usa.1',
  epl: 'soccer/eng.1',
};

async function fetchLeague(league: string): Promise<GameResult[]> {
  const path = LEAGUE_MAP[league.toLowerCase()];
  if (!path) return [];

  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${league} scores`);

  const data = await res.json();
  const events = data.events ?? [];

  return events.map((event: Record<string, unknown>) => {
    const competition = (event.competitions as Record<string, unknown>[])?.[0];
    const competitors = (competition?.competitors as Record<string, unknown>[]) ?? [];

    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');

    const homeTeam = home?.team as Record<string, unknown> | undefined;
    const awayTeam = away?.team as Record<string, unknown> | undefined;

    const status = event.status as Record<string, unknown> | undefined;
    const statusType = status?.type as Record<string, unknown> | undefined;

    return {
      id: event.id as string,
      league: league.toUpperCase(),
      homeTeam: (homeTeam?.displayName as string) ?? 'TBD',
      awayTeam: (awayTeam?.displayName as string) ?? 'TBD',
      homeScore: Number(home?.score ?? 0),
      awayScore: Number(away?.score ?? 0),
      status: (statusType?.description as string) ?? 'Scheduled',
      startTime: (event.date as string) ?? '',
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const leaguesParam = request.nextUrl.searchParams.get('leagues') || 'nfl,nba';
    const leagues = leaguesParam.split(',').map((l) => l.trim()).filter(Boolean);

    const cacheKey = [...leagues].sort().join(',');
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const results = await Promise.all(leagues.map(fetchLeague));
    const games = results.flat();
    const response = { games };

    cache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch sports scores');
  }
}
