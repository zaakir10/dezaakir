import type { RequestHandler } from "express";
import { recordAudit } from "../services/audit.service.js";
import { AppError } from "../utils/AppError.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function hasUnsafeKey(value: unknown, depth = 0): string | null {
  if (depth > 12 || value === null || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = hasUnsafeKey(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key.startsWith("$") || key.includes(".") || FORBIDDEN_KEYS.has(key)) {
      return key;
    }
    const nested = (value as Record<string, unknown>)[key];
    const hit = hasUnsafeKey(nested, depth + 1);
    if (hit) return hit;
  }

  return null;
}

function stripNullBytes(value: unknown, depth = 0): unknown {
  if (depth > 12) return value;
  if (typeof value === "string") return value.replace(/\u0000/g, "");
  if (Array.isArray(value)) return value.map((item) => stripNullBytes(item, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripNullBytes(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Blocks NoSQL operator injection (`$ne`, `$gt`, `$where`, dotted keys) and prototype
 * pollution keys across `req.body`, `req.query`, and `req.params`, and logs suspicious requests.
 */
export const sanitizeInput: RequestHandler = async (req, _res, next) => {
  try {
    const unsafeKey =
      hasUnsafeKey(req.body) ?? hasUnsafeKey(req.query) ?? hasUnsafeKey(req.params);

    if (unsafeKey) {
      await recordAudit({
        category: "SECURITY",
        action: "security.nosql_injection_blocked",
        outcome: "DENIED",
        actor: req.user?._id,
        actorEmail: req.user?.email,
        req,
        metadata: { unsafeKey, path: req.originalUrl, method: req.method },
      });
      return next(
        new AppError(400, "NOSQL_INJECTION_DETECTED", "Request contains disallowed query operators or keys"),
      );
    }

    if (req.body && typeof req.body === "object") {
      req.body = stripNullBytes(req.body);
    }

    next();
  } catch (err) {
    next(err);
  }
};
