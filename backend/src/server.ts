import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { verifySmtpConnection } from "./services/email.service.js";
import { logger } from "./utils/logger.js";

async function start() {
  try {
    await connectDatabase();
  } catch (err) {
    // Log the error type only; driver messages can include the connection host.
    logger.fatal({ errName: err instanceof Error ? err.name : "Unknown" }, "Could not connect to MongoDB");
    process.exit(1);
  }

  await verifySmtpConnection();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "Dezaakir API listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      await disconnectDatabase().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

void start();
