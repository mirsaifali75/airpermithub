/**
 * Fixed-window rate limiter kept in memory. Each serverless instance keeps
 * its own counts, so this blunts bursts rather than enforcing a global quota;
 * a shared store (or Vercel's firewall rules) replaces it once the database
 * lands in Phase 10.
 */

interface Window {
  start: number;
  count: number;
}

export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; remaining: number; retryAfterSeconds: number };
}

export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const windows = new Map<string, Window>();
  return {
    check(key, now = Date.now()) {
      let w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        if (!w && windows.size >= maxKeys) {
          // Drop the oldest entry so memory stays bounded.
          const oldest = windows.keys().next().value;
          if (oldest !== undefined) windows.delete(oldest);
        }
        w = { start: now, count: 0 };
        windows.set(key, w);
      }
      w.count += 1;
      const allowed = w.count <= limit;
      return {
        allowed,
        remaining: Math.max(0, limit - w.count),
        retryAfterSeconds: allowed ? 0 : Math.ceil((w.start + windowMs - now) / 1000),
      };
    },
  };
}

/** Best-effort client key from the proxy headers Vercel sets. */
export function clientKey(req: { headers: Pick<Headers, "get"> }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
