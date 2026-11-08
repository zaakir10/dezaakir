import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { sendError } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found");
};

/**
 * Final error handler. Never leaks stack traces, driver messages or internal
 * details to clients; full detail is logged server-side with the request id.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err, requestId: req.id }, "Operational error");
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }

  // Body-parser errors (malformed JSON, payload too large)
  const status = typeof err?.status === "number" ? err.status : undefined;
  if (err?.type === "entity.too.large" || status === 413) {
    return sendError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }
  if (err?.type === "entity.parse.failed") {
    return sendError(res, 400, "INVALID_JSON", "Malformed JSON body");
  }

  // MongoDB / Mongoose connectivity errors (e.g. Atlas IP whitelist / network drop)
  const errName = typeof err?.name === "string" ? err.name : "";
  if (
    errName === "MongooseServerSelectionError" ||
    errName === "MongoServerSelectionError" ||
    errName === "MongoNetworkError" ||
    errName === "MongoNetworkTimeoutError"
  ) {
    logger.error({ errName, requestId: req.id, path: req.path }, "Database connectivity error");
    return sendError(
      res,
      503,
      "DATABASE_UNAVAILABLE",
      "Database connection is temporarily unavailable. If using MongoDB Atlas, verify that your current IP address is whitelisted in Atlas Network Access.",
    );
  }

  logger.error({ err, requestId: req.id, path: req.path, method: req.method }, "Unhandled error");
  return sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred");
};
