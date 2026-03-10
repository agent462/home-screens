import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, createTTLCache } from '@/lib/api-utils';
import { LEAGUE_MAP } from '@/lib/espn';

export const dynamic = 'force-dynamic';

interface GameResult {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeTeamColor: string;
  awayTeamColor: string;
  homeScore: number;
  awayScore: number;
  homeRecord: string;
  awayRecord: string;
  status: string;
  detail: string;
  shortDetail: string;
  state: 'pre' | 'in' | 'post';
  startTime: string;
  broadcast: string;
}

const cache = createTTLCache<unknown>(60_000);

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

    const homeRecords = home?.records as Record<string, unknown>[] | undefined;
    const awayRecords = away?.records as Record<string, unknown>[] | undefined;

    const broadcasts = competition?.broadcasts as Record<string, unknown>[] | undefined;
    const nationalBroadcast = broadcasts?.find((b) => b.market === 'national') ?? broadcasts?.[0];
    const broadcastNames = nationalBroadcast?.names as string[] | undefined;

    const status = event.status as Record<string, unknown> | undefined;
    const statusType = status?.type as Record<string, unknown> | undefined;

    return {
      id: event.id as string,
      league: league.toUpperCase(),
      homeTeam: (homeTeam?.displayName as string) ?? 'TBD',
      awayTeam: (awayTeam?.displayName as string) ?? 'TBD',
      homeTeamAbbr: (homeTeam?.abbreviation as string) ?? '',
      awayTeamAbbr: (awayTeam?.abbreviation as string) ?? '',
      homeTeamLogo: (homeTeam?.logo as string) ?? '',
      awayTeamLogo: (awayTeam?.logo as string) ?? '',
      homeTeamColor: (homeTeam?.color as string) ?? '666666',
      awayTeamColor: (awayTeam?.color as string) ?? '666666',
      homeScore: Number(home?.score ?? 0),
      awayScore: Number(away?.score ?? 0),
      homeRecord: (homeRecords?.[0]?.summary as string) ?? '',
      awayRecord: (awayRecords?.[0]?.summary as string) ?? '',
      status: (statusType?.description as string) ?? 'Scheduled',
      detail: (statusType?.detail as string) ?? '',
      shortDetail: (statusType?.shortDetail as string) ?? '',
      state: ((statusType?.state as string) ?? 'pre') as 'pre' | 'in' | 'post',
      startTime: (event.date as string) ?? '',
      broadcast: broadcastNames?.join(', ') ?? '',
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
