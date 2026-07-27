const buckets = new Map();

/**
 * Simple in-memory rate limit (per key, resets each window).
 * @param {string} key
 * @param {{ limit?: number; windowMs?: number }} opts
 */
export function checkRateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: limit - 1 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: Math.max(0, limit - entry.count) };
}

/**
 * @param {Request} request
 */
export function clientIpFromRequest(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
