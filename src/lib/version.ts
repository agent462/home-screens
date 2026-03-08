import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface VersionInfo {
  current: string;
  currentCommit: string;
  latest: string | null;
  latestCommit: string | null;
  updateAvailable: boolean;
  installedVia: 'git' | 'unknown';
  channel: string;
}

export interface TagInfo {
  tag: string;
  version: string;
  commit: string;
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

/** Get the git remote URL */
export async function getRemoteUrl(): Promise<string | null> {
  try {
    return await exec('git', ['remote', 'get-url', 'origin']);
  } catch {
    return null;
  }
}

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
  tags.sort((a, b) => {
    const pa = a.version.split('.').map(Number);
    const pb = b.version.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
    }
    return 0;
  });
  return tags;
}

/** Fetch tags from remote (rate-limited to once per interval) */
let lastFetchTime = 0;
const FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchRemoteTags(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastFetchTime < FETCH_INTERVAL_MS) return;
  try {
    await exec('git', ['fetch', '--tags', '--force', 'origin']);
    lastFetchTime = now;
  } catch {
    // Network may not be available
  }
}

/** Get all version tags (local) */
export async function getVersionTags(): Promise<TagInfo[]> {
  try {
    const output = await exec('git', ['show-ref', '--tags']);
    return parseVersionTags(output);
  } catch {
    return [];
  }
}

/** Get full version info */
export async function getVersionInfo(): Promise<VersionInfo> {
  const [current, commit, isGit] = await Promise.all([
    getPackageVersion(),
    getCurrentCommit(),
    isGitRepo(),
  ]);

  if (!isGit) {
    return {
      current,
      currentCommit: commit,
      latest: null,
      latestCommit: null,
      updateAvailable: false,
      installedVia: 'unknown',
      channel: 'unknown',
    };
  }

  await fetchRemoteTags();
  const tags = await getVersionTags();
  const branch = await getCurrentBranch();
  const latest = tags.length > 0 ? tags[0] : null;

  const updateAvailable = latest !== null && compareSemver(latest.version, current) > 0;

  return {
    current,
    currentCommit: commit,
    latest: latest?.version ?? null,
    latestCommit: latest?.commit ?? null,
    updateAvailable,
    installedVia: 'git',
    channel: branch,
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
