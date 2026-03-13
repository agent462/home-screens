import { cachedProxyRoute } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const { GET, cache } = cachedProxyRoute({
  ttlMs: 60 * 1000,
  url: 'https://icanhazdadjoke.com',
  fetchInit: { headers: { Accept: 'application/json' } },
  transform: (data) => ({ joke: (data as { joke: string }).joke }),
  errorMessage: 'Failed to fetch joke',
});

/** @internal */
export { GET, cache };
