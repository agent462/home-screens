import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRemoteUrl } from '@/lib/version';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try { await requireSession(request); } catch (e) { if (e instanceof Response) return e; throw e; }
  const remoteUrl = await getRemoteUrl();
  if (!remoteUrl) {
    return NextResponse.json({ error: 'No git remote configured' }, { status: 404 });
  }

  // Extract owner/repo from git URL
  const match = remoteUrl.match(/github\.com[/:](.+?)(?:\.git)?$/);
  if (!match) {
    return NextResponse.json({ error: 'Not a GitHub repository' }, { status: 400 });
  }

  const repo = match[1];

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      // Fall back to tags if no releases
      const tagsRes = await fetch(`https://api.github.com/repos/${repo}/tags?per_page=10`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        next: { revalidate: 3600 },
      });

      if (!tagsRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 502 });
      }

      const tags = await tagsRes.json();
      return NextResponse.json({
        releases: tags.map((tag: { name: string; commit: { sha: string } }) => ({
          tag: tag.name,
          name: tag.name,
          body: '',
          published: null,
          commit: tag.commit.sha.slice(0, 7),
        })),
      });
    }

    const releases = await res.json();
    return NextResponse.json({
      releases: releases.map(
        (r: { tag_name: string; name: string; body: string; published_at: string }) => ({
          tag: r.tag_name,
          name: r.name || r.tag_name,
          body: r.body || '',
          published: r.published_at,
        }),
      ),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 502 });
  }
}
