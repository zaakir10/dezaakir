/**
 * Builds/updates all MongoDB indexes (including TTL indexes).
 * Run after deploying schema changes:  bun run db:indexes
 * (autoIndex is disabled in production so index builds are explicit.)
 */
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { allModels } from "../models/index.js";
import { logger } from "../utils/logger.js";

async function main() {
  await connectDatabase();
  for (const model of allModels) {
    const dropped = await model.syncIndexes();
    logger.info({ model: model.modelName, dropped }, "Indexes synchronised");
  }
  await disconnectDatabase();
}

main().catch((err: unknown) => {
  logger.error({ errName: err instanceof Error ? err.name : "Unknown", msg: err instanceof Error ? err.message : "" }, "Index sync failed");
  process.exit(1);
});
