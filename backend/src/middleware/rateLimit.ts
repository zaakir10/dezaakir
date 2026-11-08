import type { Request, RequestHandler } from "express";
import { recordAudit } from "../services/audit.service.js";
import { AppError } from "../utils/AppError.js";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Clears all in-memory rate-limit counters (used between integration tests). */
export function resetRateLimits(): void {
  buckets.clear();
}

export interface RateLimitOptions {
  name: string;
  windowMs: number;
  max: number;
  /** Also track a separate bucket keyed by `req.body.email` when present. */
  keyByEmail?: boolean;
  message?: string;
}

function consumeBucket(key: string, windowMs: number, now: number): Bucket {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return fresh;
  }
  existing.count += 1;
  return existing;
}

function pruneExpired(now: number): void {
  if (buckets.size < 2000) return;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

function extractEmail(req: Request): string | undefined {
  const raw = (req.body as Record<string, unknown> | undefined)?.email;
  if (typeof raw === "string" && raw.trim().length > 0 && raw.length <= 254) {
    return raw.trim().toLowerCase();
  }
  return undefined;
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const {
    name,
    windowMs,
    max,
    keyByEmail = false,
    message = "Too many requests, please try again later",
  } = options;

  return async (req, res, next) => {
    try {
      const now = Date.now();
      pruneExpired(now);

      const ip = req.ip || "unknown";
      const ipBucket = consumeBucket(`ip:${name}:${ip}`, windowMs, now);

      let activeBucket = ipBucket;
      if (keyByEmail) {
        const email = extractEmail(req);
        if (email) {
          const emailBucket = consumeBucket(`email:${name}:${email}`, windowMs, now);
          if (emailBucket.count > activeBucket.count) {
            activeBucket = emailBucket;
          }
        }
      }

      const remaining = Math.max(0, max - activeBucket.count);
      const resetSeconds = Math.max(1, Math.ceil((activeBucket.resetAt - now) / 1000));

      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (activeBucket.count > max) {
        res.setHeader("Retry-After", String(resetSeconds));
        await recordAudit({
          category: "SECURITY",
          action: "security.rate_limited",
          outcome: "DENIED",
          actor: req.user?._id,
          actorEmail: req.user?.email ?? extractEmail(req),
          req,
          metadata: { limiter: name, limit: max, windowMs },
        });
        return next(AppError.tooMany(message));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// Pre-configured limiters for authentication and public endpoints
export const registerLimiter = createRateLimiter({
  name: "auth_register",
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyByEmail: true,
});

export const otpVerifyLimiter = createRateLimiter({
  name: "auth_verify_otp",
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyByEmail: true,
});

export const otpResendLimiter = createRateLimiter({
  name: "auth_resend_otp",
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyByEmail: true,
});

export const loginLimiter = createRateLimiter({
  name: "auth_login",
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyByEmail: true,
});

export const passwordResetLimiter = createRateLimiter({
  name: "auth_password_reset",
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyByEmail: true,
});

export const contactLimiter = createRateLimiter({
  name: "public_contact",
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyByEmail: true,
  message: "Too many contact messages submitted. Please wait a few minutes before trying again.",
});
