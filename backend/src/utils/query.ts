import mongoose from "mongoose";
import { AppError } from "./AppError.js";

/**
 * Marks a server-built filter fragment (e.g. `{ $gt: new Date() }`) as trusted so
 * the global `sanitizeFilter` setting does not neutralise it.
 * ONLY pass values constructed by server code — never raw user input.
 */
export const trusted = <T>(value: T): T => mongoose.trusted(value) as T;

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function isObjectId(value: unknown): boolean {
  return typeof value === "string" && OBJECT_ID.test(value);
}

/** Converts a validated string to an ObjectId, or throws a 400 / 404-safe error. */
export function toObjectId(value: unknown, notFound = false): mongoose.Types.ObjectId {
  if (!isObjectId(value)) {
    throw notFound ? AppError.notFound() : AppError.badRequest("Invalid identifier");
  }
  return new mongoose.Types.ObjectId(String(value));
}

/** Escapes a user search string for safe use inside a RegExp (prevents ReDoS / regex injection). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface PageParams {
  page: number;
  limit: number;
}

/** Clamps pagination to safe bounds regardless of what the client sends. */
export function normalizePage(page: unknown, limit: unknown, maxLimit = 50): PageParams {
  const p = Number.isInteger(Number(page)) ? Math.max(1, Math.min(Number(page), 10_000)) : 1;
  const l = Number.isInteger(Number(limit)) ? Math.max(1, Math.min(Number(limit), maxLimit)) : 10;
  return { page: p, limit: l };
}
