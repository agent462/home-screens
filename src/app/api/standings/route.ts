import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, createTTLCache } from '@/lib/api-utils';
import { LEAGUE_MAP } from '@/lib/espn';

export const dynamic = 'force-dynamic';

const cache = createTTLCache<unknown>(300_000); // 5 minute cache
const colorCache = createTTLCache<Map<string, string>>(3600_000); // 1 hour for colors

// Static division mappings for leagues where ESPN doesn't provide division-level data
const DIVISION_MAP: Record<string, Record<string, string[]>> = {
  nfl: {
    'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC South': ['HOU', 'IND', 'JAX', 'TEN'],
    'AFC West': ['DEN', 'KC', 'LAC', 'LV'],
    'NFC East': ['DAL', 'NYG', 'PHI', 'WSH'],
    'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
    'NFC West': ['ARI', 'LAR', 'SEA', 'SF'],
  },
  nba: {
    'Atlantic': ['BOS', 'BKN', 'NY', 'PHI', 'TOR'],
    'Central': ['CHI', 'CLE', 'DET', 'IND', 'MIL'],
    'Southeast': ['ATL', 'CHA', 'MIA', 'ORL', 'WSH'],
    'Northwest': ['DEN', 'MIN', 'OKC', 'POR', 'UTAH'],
    'Pacific': ['GS', 'LAC', 'LAL', 'PHX', 'SAC'],
    'Southwest': ['DAL', 'HOU', 'MEM', 'NO', 'SA'],
  },
  mlb: {
    'AL East': ['BAL', 'BOS', 'NYY', 'TB', 'TOR'],
    'AL Central': ['CHW', 'CLE', 'DET', 'KC', 'MIN'],
    'AL West': ['HOU', 'LAA', 'ATH', 'SEA', 'TEX'],
    'NL East': ['ATL', 'MIA', 'NYM', 'PHI', 'WSH'],
    'NL Central': ['CHC', 'CIN', 'MIL', 'PIT', 'STL'],
    'NL West': ['ARI', 'COL', 'LAD', 'SD', 'SF'],
  },
  nhl: {
    'Atlantic': ['BOS', 'BUF', 'DET', 'FLA', 'MTL', 'OTT', 'TB', 'TOR'],
    'Metropolitan': ['CAR', 'CBJ', 'NJ', 'NYI', 'NYR', 'PHI', 'PIT', 'WSH'],
    'Central': ['CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'WPG', 'UTA'],
    'Pacific': ['ANA', 'CGY', 'EDM', 'LA', 'SEA', 'SJ', 'VAN', 'VGK'],
  },
};

interface ParsedEntry {
  rank: number;
  team: string;
  teamAbbr: string;
  teamShort: string;
  teamLogo: string;
  teamColor: string;
  wins: number;
  losses: number;
  ties?: number;
  otLosses?: number;
  draws?: number;
  points?: number;
  winPct: number;
  gamesBack?: number;
  streak?: string;
  clincher?: string;
  playoffSeed?: number;
  gamesPlayed?: number;
  last10?: string;
  pointsFor?: number;
  pointsAgainst?: number;
  differential?: number;
  homeRecord?: string;
  awayRecord?: string;
  divRecord?: string;
  goalDiff?: number;
}

interface ParsedGroup {
  name: string;
  league: string;
  entries: ParsedEntry[];
}

function getStat(stats: Record<string, unknown>[], name: string): string | number | undefined {
  const stat = stats.find((s) => s.name === name || s.abbreviation === name);
  return stat?.displayValue as string | undefined ?? stat?.value as number | undefined;
}

function getStatNum(stats: Record<string, unknown>[], name: string): number | undefined {
  const stat = stats.find((s) => s.name === name || s.abbreviation === name);
  if (stat?.value !== undefined) return Number(stat.value);
  if (stat?.displayValue !== undefined) return Number(stat.displayValue);
  return undefined;
}

/** Sort raw standings entries by playoffSeed, then points (desc), then wins (desc) */
function sortStandingsEntries(entries: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...entries].sort((a, b) => {
    const statsA = (a.stats as Record<string, unknown>[]) ?? [];
    const statsB = (b.stats as Record<string, unknown>[]) ?? [];
    const seedA = getStatNum(statsA, 'playoffSeed') ?? 999;
    const seedB = getStatNum(statsB, 'playoffSeed') ?? 999;
    if (seedA !== seedB) return seedA - seedB;
    const ptsA = getStatNum(statsA, 'points') ?? 0;
    const ptsB = getStatNum(statsB, 'points') ?? 0;
    if (ptsA !== ptsB) return ptsB - ptsA;
    const winsA = getStatNum(statsA, 'wins') ?? 0;
    const winsB = getStatNum(statsB, 'wins') ?? 0;
    return winsB - winsA;
  });
}

function parseEntry(
  entry: Record<string, unknown>,
  rank: number,
  league: string,
): ParsedEntry {
  const team = entry.team as Record<string, unknown> | undefined;
  const stats = (entry.stats as Record<string, unknown>[]) ?? [];
  const logos = (team?.logos as Record<string, unknown>[]) ?? [];
  const logo = (logos[0]?.href as string) ?? '';

  const leagueKey = league.toLowerCase();
  const isSoccer = ['mls', 'epl', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'liga_mx'].includes(leagueKey);
  const isNHL = leagueKey === 'nhl';
  const isNFL = leagueKey === 'nfl';

  const wins = getStatNum(stats, 'wins') ?? 0;
  const losses = getStatNum(stats, 'losses') ?? 0;
  const clincher = getStat(stats, 'clincher') as string | undefined;
  const playoffSeed = getStatNum(stats, 'playoffSeed');

  const result: ParsedEntry = {
    rank,
    team: (team?.displayName as string) ?? 'Unknown',
    teamAbbr: (team?.abbreviation as string) ?? '???',
    teamShort: (team?.shortDisplayName as string) ?? (team?.name as string) ?? '',
    teamLogo: logo,
    teamColor: (team?.color as string) ?? '666666',
    wins,
    losses,
    winPct: getStatNum(stats, 'winPercent') ?? getStatNum(stats, 'winPct') ?? (wins + losses > 0 ? wins / (wins + losses) : 0),
    clincher: clincher && clincher !== '' ? clincher : undefined,
    playoffSeed: playoffSeed,
  };

  // Sport-specific stats
  // Prefer pointDifferential (integer total) over differential (float per-game avg)
  if (isNFL) {
    result.ties = getStatNum(stats, 'ties');
    result.pointsFor = getStatNum(stats, 'pointsFor');
    result.pointsAgainst = getStatNum(stats, 'pointsAgainst');
    result.differential = getStatNum(stats, 'pointDifferential') ?? getStatNum(stats, 'pointsDiff');
    result.streak = getStat(stats, 'streak') as string | undefined;
    result.divRecord = getStat(stats, 'divisionRecord') as string | undefined;
  } else if (isNHL) {
    result.otLosses = getStatNum(stats, 'otLosses') ?? getStatNum(stats, 'overtimeLosses');
    result.points = getStatNum(stats, 'points');
    result.gamesPlayed = getStatNum(stats, 'gamesPlayed');
    result.streak = getStat(stats, 'streak') as string | undefined;
    result.differential = getStatNum(stats, 'pointDifferential') ?? getStatNum(stats, 'pointsDiff');
    result.homeRecord = getStat(stats, 'homeRecord') as string | undefined ?? getStat(stats, 'Home') as string | undefined;
    result.awayRecord = getStat(stats, 'awayRecord') as string | undefined ?? getStat(stats, 'Road') as string | undefined ?? getStat(stats, 'Away') as string | undefined;
    result.last10 = getStat(stats, 'Last Ten Games') as string | undefined ?? getStat(stats, 'last10Record') as string | undefined;
  } else if (isSoccer) {
    result.draws = getStatNum(stats, 'ties') ?? getStatNum(stats, 'draws');
    result.points = getStatNum(stats, 'points');
    result.gamesPlayed = getStatNum(stats, 'gamesPlayed');
    result.pointsFor = getStatNum(stats, 'pointsFor');
    result.pointsAgainst = getStatNum(stats, 'pointsAgainst');
    result.goalDiff = getStatNum(stats, 'pointDifferential') ?? getStatNum(stats, 'pointsDiff');
    result.winPct = result.points !== undefined && result.gamesPlayed
      ? result.points / (result.gamesPlayed * 3)
      : result.winPct;
  } else {
    // NBA, MLB, WNBA
    result.gamesBack = getStatNum(stats, 'gamesBehind');
    result.streak = getStat(stats, 'streak') as string | undefined;
    result.last10 = getStat(stats, 'Last Ten Games') as string | undefined ?? getStat(stats, 'last10Record') as string | undefined;
    result.homeRecord = getStat(stats, 'homeRecord') as string | undefined ?? getStat(stats, 'Home') as string | undefined;
    result.awayRecord = getStat(stats, 'awayRecord') as string | undefined ?? getStat(stats, 'Road') as string | undefined ?? getStat(stats, 'Away') as string | undefined;
    result.differential = getStatNum(stats, 'pointDifferential') ?? getStatNum(stats, 'pointsDiff');
    result.pointsFor = getStatNum(stats, 'pointsFor');
    result.pointsAgainst = getStatNum(stats, 'pointsAgainst');
  }

  return result;
}

function parseStandings(data: Record<string, unknown>, league: string): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  const leagueUpper = league.toUpperCase();

  const children = data.children as Record<string, unknown>[] | undefined;
  if (!children || children.length === 0) {
    // Flat structure — single group
    const standings = data.standings as Record<string, unknown> | undefined;
    const entries = (standings?.entries as Record<string, unknown>[]) ?? [];
    if (entries.length > 0) {
      const sorted = sortStandingsEntries(entries);
      groups.push({
        name: (data.name as string) ?? leagueUpper,
        league: leagueUpper,
        entries: sorted.map((e, i) => parseEntry(e, i + 1, league)),
      });
    }
    return groups;
  }

  // Hierarchical: conferences with optional division children
  for (const conf of children) {
    const confName = (conf.name as string) ?? 'Conference';
    const confChildren = conf.children as Record<string, unknown>[] | undefined;

    if (confChildren && confChildren.length > 0) {
      // Has divisions
      for (const div of confChildren) {
        const divName = (div.name as string) ?? 'Division';
        const standings = div.standings as Record<string, unknown> | undefined;
        const entries = (standings?.entries as Record<string, unknown>[]) ?? [];
        const sorted = sortStandingsEntries(entries);
        groups.push({
          name: divName,
          league: leagueUpper,
          entries: sorted.map((e, i) => parseEntry(e, i + 1, league)),
        });
      }
    } else {
      // Conference level only
      const standings = conf.standings as Record<string, unknown> | undefined;
      const entries = (standings?.entries as Record<string, unknown>[]) ?? [];
      const sorted = sortStandingsEntries(entries);
      groups.push({
        name: confName,
        league: leagueUpper,
        entries: sorted.map((e, i) => parseEntry(e, i + 1, league)),
      });
    }
  }

  return groups;
}

async function fetchTeamColors(path: string, league: string): Promise<Map<string, string>> {
  const cached = colorCache.get(league);
  if (cached) return cached;

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams`;
    const res = await fetch(url);
    if (!res.ok) return new Map();
    const data = await res.json();
    const teams = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];
    const colorMap = new Map<string, string>();
    for (const t of teams) {
      const team = t.team ?? t;
      const abbr = team.abbreviation as string;
      const color = team.color as string;
      if (abbr && color) colorMap.set(abbr, color);
    }
    colorCache.set(league, colorMap);
    return colorMap;
  } catch {
    return new Map();
  }
}

export async function GET(request: NextRequest) {
  try {
    const league = request.nextUrl.searchParams.get('league') || 'nfl';
    const grouping = request.nextUrl.searchParams.get('grouping') || 'division';

    const path = LEAGUE_MAP[league.toLowerCase()];
    if (!path) {
      return NextResponse.json({ error: `Unknown league: ${league}` }, { status: 400 });
    }

    const cacheKey = `${league}:${grouping}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const url = `https://site.api.espn.com/apis/v2/sports/${path}/standings`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch ${league} standings: ${res.status}` },
        { status: 502 },
      );
    }

    const [data, teamColors] = await Promise.all([
      res.json(),
      fetchTeamColors(path, league),
    ]);
    let allGroups = parseStandings(data, league);

    // Apply grouping
    if (grouping === 'conference') {
      // Merge divisions into conferences
      const confMap = new Map<string, ParsedGroup>();
      const children = data.children as Record<string, unknown>[] | undefined;

      if (children && children.length > 0) {
        for (const conf of children) {
          const confName = (conf.name as string) ?? 'Conference';
          const confChildren = conf.children as Record<string, unknown>[] | undefined;

          if (confChildren && confChildren.length > 0) {
            // Has divisions — merge them into one conference group
            const allEntries: ParsedEntry[] = [];
            for (const div of confChildren) {
              const standings = div.standings as Record<string, unknown> | undefined;
              const entries = (standings?.entries as Record<string, unknown>[]) ?? [];
              allEntries.push(...entries.map((e, i) => parseEntry(e, i + 1, league)));
            }
            // Re-sort and re-rank
            allEntries.sort((a, b) => {
              if (a.points !== undefined && b.points !== undefined && a.points !== b.points) return b.points - a.points;
              if (a.winPct !== b.winPct) return b.winPct - a.winPct;
              return b.wins - a.wins;
            });
            allEntries.forEach((e, i) => { e.rank = i + 1; });
            confMap.set(confName, { name: confName, league: league.toUpperCase(), entries: allEntries });
          } else {
            // Already conference level
            const existing = allGroups.find((g) => g.name === confName);
            if (existing) confMap.set(confName, existing);
          }
        }
        allGroups = Array.from(confMap.values());
      }
      // If no children structure, allGroups stays as-is
    } else if (grouping === 'league') {
      // Merge everything into one flat list
      const allEntries = allGroups.flatMap((g) => g.entries);
      allEntries.sort((a, b) => {
        if (a.points !== undefined && b.points !== undefined && a.points !== b.points) return b.points - a.points;
        if (a.winPct !== b.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });
      allEntries.forEach((e, i) => { e.rank = i + 1; });
      allGroups = [{ name: league.toUpperCase(), league: league.toUpperCase(), entries: allEntries }];
    } else if (grouping === 'division') {
      // Use static division mapping to split conference groups into divisions
      const divMap = DIVISION_MAP[league.toLowerCase()];
      if (divMap) {
        const allEntries = allGroups.flatMap((g) => g.entries);
        const divGroups: ParsedGroup[] = [];
        for (const [divName, teamAbbrs] of Object.entries(divMap)) {
          const divEntries = allEntries
            .filter((e) => teamAbbrs.includes(e.teamAbbr))
            .sort((a, b) => {
              if (a.points !== undefined && b.points !== undefined && a.points !== b.points) return b.points - a.points;
              if (a.winPct !== b.winPct) return b.winPct - a.winPct;
              return b.wins - a.wins;
            });
          divEntries.forEach((e, i) => { e.rank = i + 1; });
          if (divEntries.length > 0) {
            divGroups.push({ name: divName, league: league.toUpperCase(), entries: divEntries });
          }
        }
        if (divGroups.length > 0) allGroups = divGroups;
      }
      // No division map available — allGroups stays as-is (conference level)
    }

    // Merge team colors from teams API (standings API doesn't include them)
    if (teamColors.size > 0) {
      for (const group of allGroups) {
        for (const entry of group.entries) {
          const color = teamColors.get(entry.teamAbbr);
          if (color) entry.teamColor = color;
        }
      }
    }

    const response = { groups: allGroups };
    cache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch standings');
  }
}
