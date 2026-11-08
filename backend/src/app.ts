import express, { type RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import { env, isProduction } from "./config/env.js";
import { requestId } from "./middleware/requestId.js";
import { loadSession } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { sendError } from "./utils/apiResponse.js";

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

/** Reject HTTP methods the API never uses (TRACE, CONNECT, etc.). */
const restrictMethods: RequestHandler = (req, res, next) => {
  if (!ALLOWED_METHODS.includes(req.method)) {
    res.setHeader("Allow", ALLOWED_METHODS.join(", "));
    return void sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  }
  next();
};

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.set("query parser", "simple"); // no nested objects from query strings (blocks ?a[$ne]=x)

  app.use(requestId);
  app.use(restrictMethods);

  // The API serves JSON only, so the CSP can be maximally strict.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      strictTransportSecurity: isProduction
        ? { maxAge: 63072000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    next();
  });

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ALLOWED_METHODS,
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: "100kb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));
  app.use(loadSession);

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
