import mongoose from "mongoose";
import { env, isProduction, isTest } from "./env.js";
import { logger } from "../utils/logger.js";

const LOCAL_DEV_FALLBACK_URI = "mongodb://127.0.0.1:27017/dezaakir_dev";

/**
 * Global Mongoose hardening — applied once, before any model is compiled.
 *
 * - strictQuery: filter paths not in the schema are stripped, never passed to MongoDB.
 * - strict "throw": writing unknown fields throws instead of being silently dropped.
 *   (Mass-assignment is primarily blocked by strict Zod schemas; this is defence in depth.)
 * - sanitizeFilter: any user-supplied object containing `$`-operators inside a filter is
 *   wrapped in `$eq`, neutralising NoSQL operator injection. Trusted server-side
 *   operators must be wrapped with `trusted()` (see utils/query.ts).
 * - autoIndex is disabled in production; indexes are built by `bun run db:indexes`.
 */
mongoose.set("strictQuery", true);
mongoose.set("strict", "throw");
mongoose.set("sanitizeFilter", true);
mongoose.set("autoIndex", !isProduction);
mongoose.set("translateAliases", false);

/** Production must use TLS (Atlas `mongodb+srv://` enables TLS by default). */
export function assertSecureUri(uri: string, production = isProduction): void {
  if (!production) return;
  const usesSrv = uri.startsWith("mongodb+srv://");
  const tlsExplicit = /[?&](tls|ssl)=true\b/i.test(uri);
  const tlsDisabled = /[?&](tls|ssl)=false\b/i.test(uri);
  if (tlsDisabled || (!usesSrv && !tlsExplicit)) {
    throw new Error("Refusing to connect: production MongoDB connections must use TLS");
  }
  if (/[?&]tlsAllowInvalidCertificates=true\b/i.test(uri) || /[?&]tlsInsecure=true\b/i.test(uri)) {
    throw new Error("Refusing to connect: insecure TLS options are not allowed in production");
  }
}

let listenersAttached = false;

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  assertSecureUri(uri);

  if (!listenersAttached) {
    mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
    mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
    // Never log the error object's connection string.
    mongoose.connection.on("error", (err: Error) => logger.error({ errName: err.name }, "MongoDB connection error"));
    listenersAttached = true;
  }

  const isDefaultDevConnect = !isProduction && !isTest && uri === env.MONGODB_URI;

  try {
    return await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isDefaultDevConnect ? 4_000 : 10_000,
      maxPoolSize: 10,
      retryWrites: true,
      appName: "dezaakir-api",
    });
  } catch (err) {
    if (isDefaultDevConnect && uri !== LOCAL_DEV_FALLBACK_URI) {
      logger.warn(
        {
          errName: err instanceof Error ? err.name : "Unknown",
          fallbackUri: LOCAL_DEV_FALLBACK_URI,
        },
        "Primary MongoDB URI unreachable (if using MongoDB Atlas, verify your current IP is whitelisted in Network Access). Falling back to local MongoDB for development.",
      );
      await mongoose.disconnect().catch(() => undefined);
      return mongoose.connect(LOCAL_DEV_FALLBACK_URI, {
        serverSelectionTimeoutMS: 5_000,
        maxPoolSize: 10,
        appName: "dezaakir-api-local",
      });
    }
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
