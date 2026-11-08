import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Attaches a correlation id to every request (accepts a safe upstream id, otherwise generates one). */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("x-request-id");
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};
