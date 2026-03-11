import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We can't import the singleton directly for isolated tests, so we
// import the module and test the exported singleton, clearing between tests.
import { displayCache } from '@/lib/display-cache';

beforeEach(() => {
  displayCache.clear();
  vi.useFakeTimers();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('displayCache', () => {
  // ── get / set ────────────────────────────────────────────────────

  describe('get / set', () => {
    it('returns null on cold start (never fetched)', () => {
      expect(displayCache.get('/api/stocks')).toBeNull();
    });

    it('returns fresh data within TTL', () => {
      displayCache.set('/api/stocks', { stocks: [] }, 5000);
      vi.advanceTimersByTime(4999);

      const result = displayCache.get('/api/stocks');
      expect(result).toEqual({ data: { stocks: [] }, stale: false });
    });

    it('returns stale data after TTL expires', () => {
      displayCache.set('/api/stocks', { stocks: [] }, 5000);
      vi.advanceTimersByTime(5001);

      const result = displayCache.get('/api/stocks');
      expect(result).toEqual({ data: { stocks: [] }, stale: true });
    });

    it('returns fresh at exact TTL boundary', () => {
      displayCache.set('/api/quote', { quote: 'hi' }, 5000);
      vi.advanceTimersByTime(5000);

      const result = displayCache.get('/api/quote');
      expect(result?.stale).toBe(false);
    });

    it('overwrites existing entry', () => {
      displayCache.set('/api/quote', { quote: 'first' }, 5000);
      displayCache.set('/api/quote', { quote: 'second' }, 5000);

      expect(displayCache.get('/api/quote')?.data).toEqual({ quote: 'second' });
    });
  });

  // ── LRU eviction ────────────────────────────────────────────────

  describe('LRU eviction', () => {
    it('evicts least-recently-accessed entry when at capacity', () => {
      // Fill 100 entries (MAX_ENTRIES)
      for (let i = 0; i < 100; i++) {
        displayCache.set(`/api/item-${i}`, { id: i }, 60_000);
        vi.advanceTimersByTime(1); // ensure distinct lastAccessed
      }

      // Access item-0 to make it recently used
      displayCache.get('/api/item-0');

      // Insert entry 101 — should evict item-1 (oldest not accessed)
      displayCache.set('/api/item-100', { id: 100 }, 60_000);

      expect(displayCache.get('/api/item-0')).not.toBeNull(); // recently accessed
      expect(displayCache.get('/api/item-1')).toBeNull();       // evicted
      expect(displayCache.get('/api/item-100')).not.toBeNull(); // newly added
    });

    it('does not evict when updating an existing key', () => {
      for (let i = 0; i < 100; i++) {
        displayCache.set(`/api/item-${i}`, { id: i }, 60_000);
      }

      // Update existing key — should NOT trigger eviction
      displayCache.set('/api/item-0', { id: 'updated' }, 60_000);

      expect(displayCache.get('/api/item-0')?.data).toEqual({ id: 'updated' });
      // item-1 should still exist
      expect(displayCache.get('/api/item-1')).not.toBeNull();
    });
  });

  // ── clear ────────────────────────────────────────────────────────

  describe('clear', () => {
    it('removes all cached entries', () => {
      displayCache.set('/api/a', 1, 60_000);
      displayCache.set('/api/b', 2, 60_000);

      displayCache.clear();

      expect(displayCache.get('/api/a')).toBeNull();
      expect(displayCache.get('/api/b')).toBeNull();
    });
  });

  // ── prefetch ─────────────────────────────────────────────────────

  describe('prefetch', () => {
    it('fetches and caches data for a missing URL', async () => {
      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ joke: 'ha' }) }),
      ));

      await displayCache.prefetch('/api/jokes', 60_000);

      const result = displayCache.get('/api/jokes');
      expect(result?.data).toEqual({ joke: 'ha' });
      expect(result?.stale).toBe(false);
    });

    it('skips fetch when data is still fresh', async () => {
      displayCache.set('/api/jokes', { joke: 'old' }, 60_000);

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
      await displayCache.prefetch('/api/jokes', 60_000);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('refetches when data is stale', async () => {
      displayCache.set('/api/jokes', { joke: 'old' }, 1000);
      vi.advanceTimersByTime(1001);

      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ joke: 'new' }) }),
      ));

      await displayCache.prefetch('/api/jokes', 1000);

      expect(displayCache.get('/api/jokes')?.data).toEqual({ joke: 'new' });
    });

    it('deduplicates concurrent prefetch calls for the same URL', async () => {
      let resolveOuter!: () => void;
      const fetchPromise = new Promise<void>((r) => { resolveOuter = r; });

      const mockFetch = vi.fn(() =>
        fetchPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({ data: 1 }),
        })),
      );
      vi.stubGlobal('fetch', mockFetch);

      // Fire two concurrent prefetches for the same URL
      const p1 = displayCache.prefetch('/api/test', 60_000);
      const p2 = displayCache.prefetch('/api/test', 60_000);

      resolveOuter();
      await Promise.all([p1, p2]);

      // fetch should only have been called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('keeps stale data on fetch failure', async () => {
      displayCache.set('/api/jokes', { joke: 'old' }, 1000);
      vi.advanceTimersByTime(1001);

      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));

      await displayCache.prefetch('/api/jokes', 1000);

      // Should still have the old data (stale)
      expect(displayCache.get('/api/jokes')?.data).toEqual({ joke: 'old' });
    });

    it('does not cache data from a non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({ ok: false, status: 502 }),
      ));

      await displayCache.prefetch('/api/jokes', 60_000);

      expect(displayCache.get('/api/jokes')).toBeNull();
    });
  });

  // ── generation counter (clear vs in-flight) ─────────────────────

  describe('generation counter', () => {
    it('discards in-flight fetch result after clear()', async () => {
      let resolveFetch!: () => void;
      const fetchPromise = new Promise<void>((r) => { resolveFetch = r; });

      vi.stubGlobal('fetch', vi.fn(() =>
        fetchPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({ staleData: true }),
        })),
      ));

      const prefetchPromise = displayCache.prefetch('/api/test', 60_000);

      // Clear while fetch is in-flight
      displayCache.clear();

      // Now resolve the fetch
      resolveFetch();
      await prefetchPromise;

      // The stale data should NOT have been cached
      expect(displayCache.get('/api/test')).toBeNull();
    });

    it('allows new fetches after clear()', async () => {
      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ fresh: true }) }),
      ));

      displayCache.clear();
      await displayCache.prefetch('/api/test', 60_000);

      expect(displayCache.get('/api/test')?.data).toEqual({ fresh: true });
    });
  });
});
