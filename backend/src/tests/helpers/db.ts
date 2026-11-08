import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDatabase } from "../../config/database.js";
import { allModels } from "../../models/index.js";

/**
 * Ensures the local test `mongod.exe` binary is present.
 * Instead of downloading the full 600MB Windows archive (which contains >520MB of .pdb debug symbols),
 * we fetch only the 24MB `bin/mongod.exe` entry via HTTP Range request if not already cached.
 */
async function ensureMongodBinary(): Promise<string> {
  const binDir = resolve(import.meta.dir, "../../../../.bun-tmp");
  const binPath = resolve(binDir, "mongod.exe");
  if (existsSync(binPath)) return binPath;

  const url = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14.zip";
  const start = 36394;
  const end = 25367296 - 1;
  const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Failed to fetch mongod.exe test binary (${res.status})`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const dv = new DataView(buf.buffer);
  const nameLen = dv.getUint16(26, true);
  const extraLen = dv.getUint16(28, true);
  const compressed = buf.subarray(30 + nameLen + extraLen);
  const raw = inflateRawSync(compressed);
  mkdirSync(binDir, { recursive: true });
  writeFileSync(binPath, raw);
  return binPath;
}

/**
 * Spins up an isolated in-memory MongoDB for integration tests.
 * Each test file gets its own server and database.
 */
let server: MongoMemoryServer | undefined;

export async function startTestDatabase(): Promise<void> {
  const systemBinary = process.platform === "win32" ? await ensureMongodBinary() : undefined;
  server = await MongoMemoryServer.create({
    binary: { version: "7.0.14", ...(systemBinary ? { systemBinary } : {}) },
  });
  await connectDatabase(server.getUri("dezaakir_test"));
  await Promise.all(allModels.map((m) => m.init()));
}

export async function clearTestDatabase(): Promise<void> {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export async function stopTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  await server?.stop();
  server = undefined;
}
