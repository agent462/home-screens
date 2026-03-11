/** Client-side in-memory cache for module data.
 *
 * Stale-while-revalidate semantics: expired entries return data with
 * `stale: true` — they are never deleted. `null` only on cold start.
 * Bounded at MAX_ENTRIES with LRU eviction to stay safe on Pi.
 */

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
  ttlMs: number;
  lastAccessed: number;
}

const MAX_ENTRIES = 100;

class DisplayDataCache {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<void>>();
  private generation = 0;

  /**
   * Returns cached data + staleness flag.
   * Returns null ONLY if URL has never been fetched (cold start).
   */
  get<T>(url: string): { data: T; stale: boolean } | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    entry.lastAccessed = Date.now();
    const stale = Date.now() - entry.fetchedAt > entry.ttlMs;
    return { data: entry.data as T, stale };
  }

  /** Store data with TTL. Evicts LRU entry if at capacity. */
  set(url: string, data: unknown, ttlMs: number): void {
    if (!this.cache.has(url) && this.cache.size >= MAX_ENTRIES) {
      this.evictLRU();
    }
    this.cache.set(url, {
      data, fetchedAt: Date.now(), ttlMs, lastAccessed: Date.now(),
    });
  }

  /** True if entry is missing or past TTL */
  private isStale(url: string): boolean {
    const entry = this.cache.get(url);
    if (!entry) return true;
    return Date.now() - entry.fetchedAt > entry.ttlMs;
  }

  /**
   * Fire-and-forget fetch — only if stale or missing.
   * Deduplicates concurrent calls for the same URL.
   */
  async prefetch(url: string, ttlMs: number): Promise<void> {
    if (!this.isStale(url)) return;
    const existing = this.inflight.get(url);
    if (existing) return existing;
    const p = this.doFetch(url, ttlMs).finally(() => this.inflight.delete(url));
    this.inflight.set(url, p);
    return p;
  }

  /** Clear all entries (call on config change) */
  clear(): void {
    this.generation++;
    this.cache.clear();
    this.inflight.clear();
  }

  private async doFetch(url: string, ttlMs: number): Promise<void> {
    const gen = this.generation;
    try {
      const res = await fetch(url);
      if (res.ok && gen === this.generation) {
        const data = await res.json();
        this.set(url, data, ttlMs);
      }
    } catch {
      // keep existing cache entry on failure — stale data beats no data
    }
  }

  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }
    if (oldest) this.cache.delete(oldest);
  }
}

export const displayCache = new DisplayDataCache();
