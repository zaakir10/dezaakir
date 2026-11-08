/**
 * Operational error with a safe, client-facing message.
 * Anything that is not an AppError is treated as an internal error and its
 * details are never sent to the client.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Invalid request", details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new AppError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new AppError(404, "NOT_FOUND", message);
  }
  static conflict(message = "Conflict") {
    return new AppError(409, "CONFLICT", message);
  }
  static tooMany(message = "Too many requests, please try again later") {
    return new AppError(429, "RATE_LIMITED", message);
  }
}
