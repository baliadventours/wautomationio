/**
 * In-memory sliding window rate limiter per tenant/instance
 * In production multi-server, this can be backed by Redis (ioredis)
 */

interface RateLimitRecord {
  timestamps: number[];
}

const tenantWindows = new Map<string, RateLimitRecord>();

/**
 * Check if a tenant or instance has exceeded their send rate limit
 * @param key identifier (e.g. `tenant:${userId}` or `instance:${instanceId}`)
 * @param maxRequests maximum requests allowed in windowMs
 * @param windowMs window in milliseconds (default 60 seconds)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30, // 30 messages per minute default per tenant
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = tenantWindows.get(key);
  if (!record) {
    record = { timestamps: [] };
    tenantWindows.set(key, record);
  }

  // Prune timestamps older than window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = oldestTimestamp + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    };
  }

  // Record this request
  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    resetMs: windowMs,
  };
}
