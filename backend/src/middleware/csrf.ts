import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { recordAudit } from "../services/audit.service.js";
import { AppError } from "../utils/AppError.js";
import { hashToken, safeEqual } from "../utils/crypto.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ALLOWED_ORIGIN = new URL(env.FRONTEND_URL).origin;

function extractOrigin(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  try {
    return new URL(headerValue).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF protection for state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`):
 * 1. Validates `Origin` / `Referer` against `FRONTEND_URL` whenever present.
 * 2. Requires a valid per-session synchronizer token (`X-CSRF-Token`) on all
 *    authenticated state-changing requests, verified in constant time against
 *    `req.session.csrfTokenHash`. Never relies on `SameSite` alone.
 */
export const csrfProtection: RequestHandler = async (req, _res, next) => {
  try {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const originHeader = req.get("origin");
    const refererHeader = req.get("referer");
    const requestOrigin = extractOrigin(originHeader) ?? extractOrigin(refererHeader);

    if ((originHeader || refererHeader) && requestOrigin !== ALLOWED_ORIGIN) {
      await recordAudit({
        category: "SECURITY",
        action: "security.csrf_origin_mismatch",
        outcome: "DENIED",
        actor: req.user?._id,
        actorEmail: req.user?.email,
        req,
        metadata: { origin: originHeader ?? refererHeader ?? "invalid", path: req.originalUrl },
      });
      return next(new AppError(403, "CSRF_ORIGIN_MISMATCH", "Cross-origin state-changing request rejected"));
    }

    // Authenticated session requests must present a valid synchronizer CSRF token
    if (req.session) {
      const tokenHeader = req.get("x-csrf-token");
      if (!tokenHeader || tokenHeader.length < 16 || tokenHeader.length > 128) {
        await recordAudit({
          category: "SECURITY",
          action: "security.csrf_token_missing",
          outcome: "DENIED",
          actor: req.user?._id,
          actorEmail: req.user?.email,
          req,
          metadata: { path: req.originalUrl, method: req.method },
        });
        return next(new AppError(403, "CSRF_TOKEN_INVALID", "Missing or invalid CSRF token"));
      }

      const candidateHash = hashToken(tokenHeader, "csrf");
      if (!safeEqual(candidateHash, req.session.csrfTokenHash)) {
        await recordAudit({
          category: "SECURITY",
          action: "security.csrf_token_mismatch",
          outcome: "DENIED",
          actor: req.user?._id,
          actorEmail: req.user?.email,
          req,
          metadata: { path: req.originalUrl, method: req.method },
        });
        return next(new AppError(403, "CSRF_TOKEN_INVALID", "Missing or invalid CSRF token"));
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};
