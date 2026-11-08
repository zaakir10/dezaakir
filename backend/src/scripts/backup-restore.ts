import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import {
  AuditLog,
  Blog,
  Category,
  ContactMessage,
  Media,
  Project,
  SiteSettings,
  Tag,
  User,
} from "../models/index.js";
import { logger } from "../utils/logger.js";

export interface DatabaseBackupBundle {
  version: "1.0";
  createdAt: string;
  collections: {
    users: Record<string, unknown>[];
    categories: Record<string, unknown>[];
    tags: Record<string, unknown>[];
    blogs: Record<string, unknown>[];
    projects: Record<string, unknown>[];
    media: Record<string, unknown>[];
    contactMessages: Record<string, unknown>[];
    siteSettings: Record<string, unknown>[];
    auditLogs: Record<string, unknown>[];
  };
  integrity: {
    sha256: string;
    hmacSha256: string;
  };
}

function computeIntegrity(collectionsPayload: DatabaseBackupBundle["collections"]): {
  sha256: string;
  hmacSha256: string;
} {
  const canonicalJson = JSON.stringify(collectionsPayload);
  const sha256 = createHash("sha256").update(canonicalJson).digest("hex");
  const hmacSha256 = createHmac("sha256", env.SESSION_SECRET)
    .update(`backup-v1:${sha256}`)
    .digest("hex");
  return { sha256, hmacSha256 };
}

/**
 * Exports all persistent MongoDB collections into an integrity-signed backup bundle.
 * Ephemeral collections (Session, EmailVerification, PasswordResetToken) are intentionally
 * excluded so raw session/OTP state is never written to backup archives.
 */
export async function createDatabaseBackup(): Promise<DatabaseBackupBundle> {
  const [
    users,
    categories,
    tags,
    blogs,
    projects,
    media,
    contactMessages,
    siteSettings,
    auditLogs,
  ] = await Promise.all([
    User.find({})
      .select("+passwordHash +mfa.secretEncrypted +mfa.recoveryCodesHash")
      .lean(),
    Category.find({}).lean(),
    Tag.find({}).lean(),
    Blog.find({}).lean(),
    Project.find({}).lean(),
    Media.find({}).lean(),
    ContactMessage.find({}).select("+ipHash").lean(),
    SiteSettings.find({}).lean(),
    AuditLog.find({}).lean(),
  ]);

  const collections: DatabaseBackupBundle["collections"] = {
    users: JSON.parse(JSON.stringify(users)) as Record<string, unknown>[],
    categories: JSON.parse(JSON.stringify(categories)) as Record<string, unknown>[],
    tags: JSON.parse(JSON.stringify(tags)) as Record<string, unknown>[],
    blogs: JSON.parse(JSON.stringify(blogs)) as Record<string, unknown>[],
    projects: JSON.parse(JSON.stringify(projects)) as Record<string, unknown>[],
    media: JSON.parse(JSON.stringify(media)) as Record<string, unknown>[],
    contactMessages: JSON.parse(JSON.stringify(contactMessages)) as Record<string, unknown>[],
    siteSettings: JSON.parse(JSON.stringify(siteSettings)) as Record<string, unknown>[],
    auditLogs: JSON.parse(JSON.stringify(auditLogs)) as Record<string, unknown>[],
  };

  const integrity = computeIntegrity(collections);

  return {
    version: "1.0",
    createdAt: new Date().toISOString(),
    collections,
    integrity,
  };
}

/**
 * Verifies the SHA-256 checksum and keyed HMAC-SHA256 signature of a backup bundle,
 * then restores all documents idempotently into MongoDB.
 */
export async function restoreDatabaseBackup(bundle: DatabaseBackupBundle): Promise<{
  restoredCounts: Record<string, number>;
}> {
  if (!bundle || bundle.version !== "1.0" || !bundle.collections || !bundle.integrity) {
    throw new Error("Invalid backup bundle structure");
  }

  const expected = computeIntegrity(bundle.collections);
  if (
    bundle.integrity.sha256 !== expected.sha256 ||
    bundle.integrity.hmacSha256 !== expected.hmacSha256
  ) {
    throw new Error("Backup integrity check failed: checksum or HMAC signature mismatch");
  }

  const reviveDatesAndIds = (doc: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...doc };
    if (typeof out._id === "string" && /^[a-f\d]{24}$/i.test(out._id)) {
      out._id = new mongoose.Types.ObjectId(out._id);
    }
    for (const dateField of [
      "createdAt",
      "updatedAt",
      "publishedAt",
      "lastLoginAt",
      "lockUntil",
    ]) {
      if (typeof out[dateField] === "string") {
        out[dateField] = new Date(out[dateField] as string);
      }
    }
    return out;
  };

  const upsertCollection = async (
    collectionName: string,
    docs: Record<string, unknown>[]
  ): Promise<number> => {
    if (!docs || docs.length === 0) return 0;
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection is not active");
    const col = db.collection(collectionName);

    const operations = docs.map((raw) => {
      const doc = reviveDatesAndIds(raw);
      return {
        replaceOne: {
          filter: { _id: doc._id as mongoose.Types.ObjectId },
          replacement: doc,
          upsert: true,
        },
      };
    });

    await col.bulkWrite(operations, { ordered: false });
    return docs.length;
  };

  const restoredCounts: Record<string, number> = {
    users: await upsertCollection("users", bundle.collections.users),
    categories: await upsertCollection("categories", bundle.collections.categories),
    tags: await upsertCollection("tags", bundle.collections.tags),
    blogs: await upsertCollection("blogs", bundle.collections.blogs),
    projects: await upsertCollection("projects", bundle.collections.projects),
    media: await upsertCollection("media", bundle.collections.media),
    contactMessages: await upsertCollection(
      "contactmessages",
      bundle.collections.contactMessages
    ),
    siteSettings: await upsertCollection("sitesettings", bundle.collections.siteSettings),
    auditLogs: await upsertCollection("auditlogs", bundle.collections.auditLogs),
  };

  return { restoredCounts };
}

async function runCli() {
  const mode = process.argv[2];
  const fileArg = process.argv[3];

  await connectDatabase();
  try {
    if (mode === "backup") {
      const backupDir = path.resolve(process.cwd(), "backups");
      await mkdir(backupDir, { recursive: true });
      const targetPath = fileArg
        ? path.resolve(process.cwd(), fileArg)
        : path.join(backupDir, `dezaakir-backup-${Date.now()}.json`);
      const bundle = await createDatabaseBackup();
      await writeFile(targetPath, JSON.stringify(bundle, null, 2), "utf8");
      logger.info({ targetPath, createdAt: bundle.createdAt }, "Database backup completed");
    } else if (mode === "restore") {
      if (!fileArg) {
        throw new Error("Usage: bun src/scripts/backup-restore.ts restore <path-to-backup.json>");
      }
      const targetPath = path.resolve(process.cwd(), fileArg);
      const content = await readFile(targetPath, "utf8");
      const bundle = JSON.parse(content) as DatabaseBackupBundle;
      const result = await restoreDatabaseBackup(bundle);
      logger.info({ targetPath, restoredCounts: result.restoredCounts }, "Database restore completed");
    } else {
      throw new Error("Usage: bun src/scripts/backup-restore.ts <backup|restore> [filepath]");
    }
  } finally {
    await disconnectDatabase();
  }
}

if (import.meta.main) {
  runCli().catch((err) => {
    logger.fatal({ errName: err instanceof Error ? err.name : "Unknown", message: err instanceof Error ? err.message : "" }, "Backup/Restore CLI failed");
    process.exit(1);
  });
}
