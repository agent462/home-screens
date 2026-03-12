import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { getSecret } from './secrets';

export const GITHUB_REPO = 'agent462/home-screens';

export interface VersionInfo {
  current: string;
  currentCommit: string;
  latest: string | null;
  latestCommit: string | null;
  updateAvailable: boolean;
  installedVia: 'git' | 'tarball' | 'unknown';
  channel: string;
}

export interface TagInfo {
  tag: string;
  version: string;
  commit: string;
  hasTarball?: boolean;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: { name: string; browser_download_url: string }[];
}

function exec(cmd: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: cwd ?? process.cwd(), timeout: 30000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

/** Read version from package.json */
async function getPackageVersion(): Promise<string> {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const data = await fs.readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(data);
  return pkg.version ?? '0.0.0';
}

/** Check if running in a git repository */
async function isGitRepo(): Promise<boolean> {
  try {
    await exec('git', ['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

/** Get current commit SHA (short) */
async function getCurrentCommit(): Promise<string> {
  try {
    return await exec('git', ['rev-parse', '--short', 'HEAD']);
  } catch {
    return 'unknown';
  }
}

/** Get the current branch or tag */
async function getCurrentBranch(): Promise<string> {
  try {
    return await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// GitHub API — primary version source (works without git)
// ---------------------------------------------------------------------------

let cachedGitHubReleases: {
  releases: GitHubRelease[];
  etag: string | null;
  fetchedAt: number;
} | null = null;

const GITHUB_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getGitHubHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  try {
    const token = await getSecret('github_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // secrets module not available
  }
  return headers;
}

/** Fetch releases from GitHub API with ETag caching */
export async function fetchGitHubReleases(force = false): Promise<GitHubRelease[]> {
  if (
    !force &&
    cachedGitHubReleases &&
    Date.now() - cachedGitHubReleases.fetchedAt < GITHUB_CACHE_TTL_MS
  ) {
    return cachedGitHubReleases.releases;
  }

  const headers = await getGitHubHeaders();
  if (cachedGitHubReleases?.etag) {
    headers['If-None-Match'] = cachedGitHubReleases.etag;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`,
      { headers, signal: controller.signal },
    );

    if (res.status === 304 && cachedGitHubReleases) {
      cachedGitHubReleases.fetchedAt = Date.now();
      return cachedGitHubReleases.releases;
    }

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const releases: GitHubRelease[] = await res.json();
    const etag = res.headers.get('etag');
    const filtered = releases.filter((r) => !r.draft && !r.prerelease);

    cachedGitHubReleases = { releases: filtered, etag, fetchedAt: Date.now() };
    return filtered;
  } finally {
    clearTimeout(timeout);
  }
}

/** Convert GitHub releases to TagInfo array, sorted by semver descending */
function releasesToTags(releases: GitHubRelease[]): TagInfo[] {
  const tags: TagInfo[] = releases.map((r) => ({
    tag: r.tag_name,
    version: r.tag_name.replace(/^v/, ''),
    commit: '', // GitHub releases don't include commit SHA directly
    hasTarball: r.assets.some((a) => a.name.startsWith('home-screens-') && a.name.endsWith('.tar.gz')),
  }));

  tags.sort((a, b) => compareSemver(b.version, a.version));
  return tags;
}

/** Check if a specific tag has a pre-built tarball on GitHub Releases */
export async function hasReleaseTarball(tag: string): Promise<boolean> {
  try {
    const releases = await fetchGitHubReleases();
    const release = releases.find((r) => r.tag_name === tag);
    if (!release) return false;
    return release.assets.some(
      (a) => a.name === `home-screens-${tag}.tar.gz`,
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Git-based version checking (fallback)
// ---------------------------------------------------------------------------

/** Parse version tags from git, sorted descending */
export function parseVersionTags(tagLines: string): TagInfo[] {
  const tags: TagInfo[] = [];
  for (const line of tagLines.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Format: <commit> refs/tags/v1.2.3
    const match = trimmed.match(/^([a-f0-9]+)\s+refs\/tags\/(v?\d+\.\d+\.\d+.*)$/);
    if (match) {
      const version = match[2].replace(/^v/, '');
      tags.push({ tag: match[2], version, commit: match[1] });
    }
  }
  // Sort by semver descending
  tags.sort((a, b) => compareSemver(b.version, a.version));
  return tags;
}

/** Fetch tags from remote (rate-limited to once per interval) */
let lastFetchTime = 0;
const FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function fetchRemoteTags(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastFetchTime < FETCH_INTERVAL_MS) return;
  try {
    await exec('git', ['fetch', '--tags', '--force', 'origin']);
    lastFetchTime = now;
  } catch {
    // Network may not be available
  }
}

/** Get all version tags (local git) */
async function getGitVersionTags(): Promise<TagInfo[]> {
  try {
    const output = await exec('git', ['show-ref', '--tags']);
    return parseVersionTags(output);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Unified API — tries GitHub first, falls back to git
// ---------------------------------------------------------------------------

/** Get version tags — prefers GitHub API, falls back to git */
export async function getVersionTags(force = false): Promise<TagInfo[]> {
  try {
    const releases = await fetchGitHubReleases(force);
    if (releases.length > 0) {
      return releasesToTags(releases);
    }
  } catch {
    // GitHub API unavailable, fall through to git
  }

  if (await isGitRepo()) {
    if (force) await fetchRemoteTags(true);
    return getGitVersionTags();
  }

  return [];
}

/** Detect how the app was installed */
async function detectInstallMethod(): Promise<'git' | 'tarball' | 'unknown'> {
  if (await isGitRepo()) return 'git';
  // Tarball installs have server.js at root but no .git
  try {
    await fs.access(path.join(process.cwd(), 'server.js'));
    return 'tarball';
  } catch {
    return 'unknown';
  }
}

/** Get full version info */
export async function getVersionInfo(): Promise<VersionInfo> {
  const [current, commit, installedVia] = await Promise.all([
    getPackageVersion(),
    getCurrentCommit(),
    detectInstallMethod(),
  ]);

  // Try GitHub API first
  try {
    const releases = await fetchGitHubReleases();
    if (releases.length > 0) {
      const tags = releasesToTags(releases);
      const latest = tags.length > 0 ? tags[0] : null;
      const updateAvailable = latest !== null && compareSemver(latest.version, current) > 0;
      const branch = installedVia === 'git' ? await getCurrentBranch() : 'release';

      return {
        current,
        currentCommit: commit,
        latest: latest?.version ?? null,
        latestCommit: latest?.commit ?? null,
        updateAvailable,
        installedVia,
        channel: branch,
      };
    }
  } catch {
    // GitHub API unavailable, fall through
  }

  // Fallback to git
  if (installedVia === 'git') {
    await fetchRemoteTags();
    const tags = await getGitVersionTags();
    const branch = await getCurrentBranch();
    const latest = tags.length > 0 ? tags[0] : null;
    const updateAvailable = latest !== null && compareSemver(latest.version, current) > 0;

    return {
      current,
      currentCommit: commit,
      latest: latest?.version ?? null,
      latestCommit: latest?.commit ?? null,
      updateAvailable,
      installedVia,
      channel: branch,
    };
  }

  return {
    current,
    currentCommit: commit,
    latest: null,
    latestCommit: null,
    updateAvailable: false,
    installedVia,
    channel: 'unknown',
  };
}

/** Compare two semver strings. Returns >0 if a > b, <0 if a < b, 0 if equal */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
