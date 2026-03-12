import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchGitHubReleases, GITHUB_REPO } from '@/lib/version';
import { requireSession } from '@/lib/auth';
import { errorResponse, fetchWithTimeout } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);

    // Try cached GitHub releases first
    try {
      const releases = await fetchGitHubReleases();
      if (releases.length > 0) {
        return NextResponse.json({
          releases: releases.map((r) => ({
            tag: r.tag_name,
            name: r.name || r.tag_name,
            body: r.body || '',
            published: r.published_at,
          })),
        });
      }
    } catch {
      // Fall through to direct API call
    }

    // Fallback: direct API call (may hit rate limit if releases cache failed)
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
      {
        headers: { Accept: 'application/vnd.github.v3+json' },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      // Fall back to tags if no releases
      const tagsRes = await fetchWithTimeout(
        `https://api.github.com/repos/${GITHUB_REPO}/tags?per_page=10`,
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
          next: { revalidate: 3600 },
        },
      );

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
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error, 'Failed to fetch changelog');
  }
}
