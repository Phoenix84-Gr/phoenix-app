import { createHash, timingSafeEqual } from "node:crypto";

/** A browser CSRF check: the request's Origin must equal this app's own origin exactly (scheme, host and port).
 *  Browsers always send Origin on cross-site POSTs. Non-browser clients can fake it; the access code covers them. */
export function sameOrigin(origin: string | null, selfOrigin: string): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(selfOrigin).origin;
  } catch {
    return false;
  }
}

/** Compare the access code in constant time (hashing first makes the lengths equal). */
export function codeMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** A small in-memory limiter: `limit` hits per `windowMs` for each key.
 *  shortcut: per server instance and reset on restart; use a shared store if the app runs on many instances. */
export function createRateLimiter(limit = 20, windowMs = 60_000, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return function allow(key: string): boolean {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) hits.delete(hits.keys().next().value as string); // bounded memory
    return true;
  };
}
