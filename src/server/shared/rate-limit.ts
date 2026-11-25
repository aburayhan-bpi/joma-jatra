import { NextRequest } from "next/server";
import { tooManyRequests } from "../core/app-error";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Unique bucket namespace (e.g. "auth:login") */
  namespace: string;
  /** Maximum allowed requests within the window */
  max: number;
  /** Sliding window duration in milliseconds */
  windowMs: number;
  /** Optional custom error message when exceeded */
  message?: string;
}

// Keep in-memory store across Next.js dev HMR reloads
const globalForRateLimit = globalThis as unknown as {
  __jomaRateLimitStore?: Map<string, RateLimitBucket>;
};

const store =
  globalForRateLimit.__jomaRateLimitStore ??
  (globalForRateLimit.__jomaRateLimitStore = new Map<
    string,
    RateLimitBucket
  >());

const MAX_BUCKETS = 5000;

/**
 * Extracts best-effort client IP from reverse proxy headers (Vercel / Nginx / Node).
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Checks and increments an in-memory fixed-window counter.
 * Throws a 429 AppError if the limit is exceeded.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): { remaining: number; resetAt: number } {
  const now = Date.now();

  // Prune expired buckets occasionally to keep memory bounded
  if (store.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of store.entries()) {
      if (bucket.resetAt <= now) {
        store.delete(bucketKey);
      }
    }
  }

  const fullKey = `${options.namespace}:${key}`;
  const existing = store.get(fullKey);

  if (!existing || existing.resetAt <= now) {
    const fresh: RateLimitBucket = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(fullKey, fresh);
    return { remaining: Math.max(0, options.max - 1), resetAt: fresh.resetAt };
  }

  if (existing.count >= options.max) {
    const waitSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    throw tooManyRequests(
      options.message ||
        `Too many attempts. Please try again in ${waitSeconds} second(s).`,
    );
  }

  existing.count += 1;
  return {
    remaining: Math.max(0, options.max - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Convenience helper for Next.js Route Handlers keyed by client IP (plus optional suffix).
 */
export function enforceRateLimit(
  req: NextRequest,
  options: RateLimitOptions,
  keySuffix?: string,
): void {
  const ip = getClientIp(req);
  const key = keySuffix ? `${ip}:${keySuffix.toLowerCase()}` : ip;
  checkRateLimit(key, options);
}

/**
 * Clears rate-limit buckets (used by automated tests).
 */
export function clearRateLimitStore(): void {
  store.clear();
}
