import { Router } from "express";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { isDatabaseReady } from "../config/database.js";

export const healthRouter = Router();

/** Liveness probe — intentionally reveals no version, dependency or environment details. */
healthRouter.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  sendSuccess(res, { status: "ok" });
});

/** Readiness probe — 503 until the database connection is usable. */
healthRouter.get("/ready", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!isDatabaseReady()) return void sendError(res, 503, "NOT_READY", "Service not ready");
  sendSuccess(res, { status: "ready" });
});
