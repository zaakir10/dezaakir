import { createHmac } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { Session, User, type ISession, type IUser, type Role } from "../models/index.js";
import { recordAudit } from "../services/audit.service.js";
import { AppError } from "../utils/AppError.js";
import { clearSessionCookie, getSessionCookie } from "../utils/cookies.js";
import { hashToken } from "../utils/crypto.js";
import { trusted } from "../utils/query.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
      session?: ISession;
      rawSessionToken?: string;
    }
  }
}

/**
 * Deterministically derives the synchronizer CSRF token from the raw session token.
 * Because `rawSessionToken` is stored in an HttpOnly cookie, cross-origin attackers
 * cannot read it or compute the CSRF token. The server also stores `csrfTokenHash`
 * in the Session document and verifies it in constant time on state-changing requests.
 */
export function deriveCsrfToken(rawSessionToken: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(`csrf-derive:${rawSessionToken}`).digest("base64url");
}

/**
 * Loads the current session and user if a valid `dezaakir_sid` cookie is present.
 * Does not fail if unauthenticated; downstream middlewares enforce `requireAuth` / `requireRole`.
 */
export const loadSession: RequestHandler = async (req, res, next) => {
  try {
    const rawToken = getSessionCookie(req);
    if (!rawToken || rawToken.length < 20 || rawToken.length > 128) {
      return next();
    }

    const tokenHash = hashToken(rawToken, "session");
    const now = new Date();

    const session = await Session.findOne({
      tokenHash,
      revokedAt: trusted({ $exists: false }),
      expiresAt: trusted({ $gt: now }),
    })
      .select("+tokenHash +csrfTokenHash")
      .lean<ISession>();

    if (!session) {
      clearSessionCookie(res);
      return next();
    }

    const user = await User.findById(session.user).lean<IUser>();
    if (!user || user.status !== "ACTIVE" || !user.emailVerified) {
      await Session.updateOne({ _id: session._id }, { $set: { revokedAt: now } });
      clearSessionCookie(res);
      return next();
    }

    // Update lastSeenAt asynchronously if older than 60 seconds
    if (now.getTime() - new Date(session.lastSeenAt).getTime() > 60_000) {
      void Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } }).catch(() => undefined);
    }

    req.user = user;
    req.session = session;
    req.rawSessionToken = rawToken;
    next();
  } catch (err) {
    next(err);
  }
};

/** Requires an authenticated, email-verified, active user session. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user || !req.session) {
    return next(AppError.unauthorized("Authentication required"));
  }
  if (!req.user.emailVerified || req.user.status !== "ACTIVE") {
    return next(AppError.forbidden("Account is not active"));
  }
  next();
};

/**
 * Enforces role-based access control on the backend.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return async (req, _res, next) => {
    if (!req.user || !req.session) {
      return next(AppError.unauthorized("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      await recordAudit({
        category: "SECURITY",
        action: "auth.permission_denied",
        outcome: "DENIED",
        actor: req.user._id,
        actorEmail: req.user.email,
        req,
        metadata: { requiredRoles: roles.join(","), actualRole: req.user.role, path: req.originalUrl },
      });
      return next(AppError.forbidden("You do not have permission to perform this action"));
    }

    next();
  };
}

export const requireAdmin: RequestHandler = requireRole("ADMIN", "SUPER_ADMIN");
export const requireSuperAdmin: RequestHandler = requireRole("SUPER_ADMIN");
export const requireStaff: RequestHandler = requireRole("EDITOR", "ADMIN", "SUPER_ADMIN");
