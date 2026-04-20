import 'server-only';
import {getEnabledRedirectMap, incrementRedirectHit} from '@/lib/redirects';

type CacheEntry = {
  map: Map<string, {destination: string; status_code: number; id: number}>;
  fetchedAt: number;
};

const CACHE_TTL_MS = 60_000;

let cache: CacheEntry | null = null;
let inflight: Promise<CacheEntry['map']> | null = null;

async function refresh(): Promise<CacheEntry['map']> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const map = await getEnabledRedirectMap();
      cache = {map, fetchedAt: Date.now()};
      return map;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Looks up a redirect for the given pathname.
 * - Cached for 60s in memory (Fluid Compute instances reuse across requests).
 * - On stale cache, fetches in background and serves last-known-good.
 * - On first-ever call, awaits the fetch.
 * - Failure to fetch → empty map, serves no redirect (fail-open).
 */
export async function lookupRedirect(
  pathname: string
): Promise<{destination: string; status_code: number; id: number} | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.map.get(pathname) ?? null;
  }
  // Stale or never-fetched — refresh.
  if (cache) {
    // Fire-and-forget refresh; serve stale data immediately.
    void refresh();
    return cache.map.get(pathname) ?? null;
  }
  const map = await refresh();
  return map.get(pathname) ?? null;
}

/** Fire-and-forget hit count increment. Safe to call in proxy hot path. */
export function recordRedirectHit(id: number): void {
  void incrementRedirectHit(id);
}
