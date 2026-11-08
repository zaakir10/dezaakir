import { Router } from "express";
import { sendSuccess } from "../utils/apiResponse.js";

export const healthRouter = Router();

/** Liveness probe — intentionally reveals no version, dependency or environment details. */
healthRouter.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  sendSuccess(res, { status: "ok" });
});
