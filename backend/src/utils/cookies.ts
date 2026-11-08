import type { CookieOptions, Request, Response } from "express";
import { isProduction } from "../config/env.js";

export const SESSION_COOKIE_NAME = "dezaakir_sid";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Returns session cookie attributes.
 * - HttpOnly=true (inaccessible to client-side JavaScript)
 * - Secure=true in production (HTTPS only)
 * - SameSite=Lax (compatible with first-party subdomain API architecture)
 * - Path=/
 */
export function getSessionCookieOptions(prod: boolean = isProduction): CookieOptions {
  return {
    httpOnly: true,
    secure: prod,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

export function setSessionCookie(res: Response, rawToken: string, prod: boolean = isProduction): void {
  res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions(prod));
}

export function clearSessionCookie(res: Response, prod: boolean = isProduction): void {
  const opts = getSessionCookieOptions(prod);
  delete opts.maxAge;
  res.clearCookie(SESSION_COOKIE_NAME, opts);
}

/** Minimal, safe Cookie header parser. */
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header || typeof header !== "string") return out;

  for (const part of header.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(rawVal);
    } catch {
      out[key] = rawVal;
    }
  }
  return out;
}

export function getSessionCookie(req: Request): string | undefined {
  return parseCookies(req)[SESSION_COOKIE_NAME];
}
