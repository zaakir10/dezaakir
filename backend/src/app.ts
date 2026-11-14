import express, { type RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import { allowedOrigins, env, isProduction, isTest } from "./config/env.js";
import { connectDatabase, isDatabaseReady } from "./config/database.js";
import { requestId } from "./middleware/requestId.js";
import { loadSession } from "./middleware/auth.js";
import { sanitizeInput } from "./middleware/sanitizeInput.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminBlogRouter, blogRouter } from "./routes/blog.routes.js";
import { adminProjectRouter, projectRouter } from "./routes/project.routes.js";
import { adminMediaRouter } from "./routes/media.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { categoriesRouter, tagsRouter } from "./routes/taxonomy.routes.js";
import { adminMessagesRouter, contactRouter } from "./routes/contact.routes.js";
import { adminSettingsRouter, settingsRouter } from "./routes/settings.routes.js";
import { sendError, sendSuccess } from "./utils/apiResponse.js";

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
      origin: (origin, callback) => {
        // Non-browser clients (curl, server-to-server) send no Origin header.
        if (!origin) return callback(null, false);
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ALLOWED_METHODS,
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
      maxAge: 600,
    }),
  );

  const standardJsonParser = express.json({ limit: "100kb", strict: true });
  const mediaJsonParser = express.json({ limit: "8mb", strict: true });
  app.use((req, res, next) => {
    if (
      req.path === "/api/admin/media/upload" ||
      req.path === "/api/auth/avatar" ||
      req.path === "/api/admin/emails/send" ||
      req.path === "/api/admin/emails/preview"
    ) {
      return mediaJsonParser(req, res, next);
    }
    return standardJsonParser(req, res, next);
  });
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));
  app.use(sanitizeInput);

  // Ensure MongoDB is connected on serverless cold starts (skip /api/health so health probes never hang)
  app.use(async (req, _res, next) => {
    if (isTest || isDatabaseReady() || req.path === "/api/health") {
      return next();
    }
    try {
      await connectDatabase();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use(loadSession);
  app.use(csrfProtection);

  app.get("/", (_req, res) => {
    sendSuccess(res, { service: "dezaakir-api", status: "ok" });
  });
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/blogs", blogRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/tags", tagsRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/admin/blogs", adminBlogRouter);
  app.use("/api/admin/projects", adminProjectRouter);
  app.use("/api/admin/media", adminMediaRouter);
  app.use("/api/admin/messages", adminMessagesRouter);
  app.use("/api/admin/settings", adminSettingsRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
