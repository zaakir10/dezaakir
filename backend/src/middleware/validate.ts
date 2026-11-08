import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates `req.params`, `req.query` and `req.body` against strict Zod schemas.
 * Parsed/normalized values replace `req.body` and `req.params`, and are stored on `req.validatedQuery`.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, string>;
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
