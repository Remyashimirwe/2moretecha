/**
 * Small sliding-window rate limiter for public read APIs
 * (`/api/domains/search`, `/api/domains/prices`).
 *
 * State lives in this module's Map, so it is per-process: perfect for a
 * single Node instance (local dev, one container). Behind a multi-instance
 * deployment, swap the Map for a shared store (Redis/Upstash/Postgres) —
 * the call sites and signatures stay identical.
 *
 * Keys are always namespaced by caller (`scope:ip`) and the IP is truncated,
 * so a single noisy client can never exhaust the map for everyone else.
 */

export type RateLimitResult = {
  ok: boolean;
  /** Seconds the caller should wait before trying again (0 when ok). */
  retryAfterSeconds: number;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup keeps memory flat without a background timer.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort caller IP: real IP from the proxy first, then the socket peer. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    forwarded?.split(",").at(-1)?.trim() ||
    "unknown";
  return ip.slice(0, 64);
}
