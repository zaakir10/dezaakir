import type { Response } from "express";

/**
 * Consistent API envelope used by every endpoint.
 *   success: { success: true, data, meta? }
 *   failure: { success: false, error: { code, message, details? } }
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: PaginationMeta) {
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function sendError(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  });
}
