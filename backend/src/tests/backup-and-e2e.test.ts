import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { resetRateLimits } from "../middleware/rateLimit.js";
import { bootstrapAdmin } from "../scripts/create-admin.js";
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
} from "../scripts/backup-restore.js";
import { clearCapturedEmails } from "../services/email.service.js";
import { generateTotpCode } from "../utils/crypto.js";
import { clearTestDatabase, startTestDatabase, stopTestDatabase } from "./helpers/db.js";

const app = createApp();

beforeAll(startTestDatabase, 300_000);
afterEach(async () => {
  resetRateLimits();
  clearCapturedEmails();
  await clearTestDatabase();
});
afterAll(stopTestDatabase);

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.some((ext) => full.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe("Phase 9 & 10: Database Backup/Restoration & Security/Brand Compliance Audit", () => {
  it("exports an HMAC-signed database backup, rejects tampered archives, and restores all collections after a full wipe (Test Case #24)", async () => {
    const credentials = {
      name: "Dezaakir",
      email: "admin@dezaakir.com",
      password: "AdminStrongPassword!123",
    };
    const bootstrapped = await bootstrapAdmin(credentials);
    const totpCode = generateTotpCode(bootstrapped.totpSecret);

    const loginRes = await request(app).post("/api/auth/login").send({
      email: credentials.email,
      password: credentials.password,
      totpCode,
    });
    const cookie = loginRes.headers["set-cookie"]![0]!.split(";")[0]!;
    const csrfToken = loginRes.body.data.csrfToken as string;

    // 1. Create a blog post, a project, a contact message, and custom site settings
    const blogRes = await request(app)
      .post("/api/blogs")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", csrfToken)
      .send({
        title: "Zero-Trust Backup Architecture",
        excerpt: "Designing cryptographic integrity checks for MongoDB backups.",
        content: "<h2>Backup Strategy</h2><p>Always verify HMAC signatures before restoring.</p>",
        status: "PUBLISHED",
        featured: true,
      });
    expect(blogRes.status).toBe(201);

    const projRes = await request(app)
      .post("/api/projects")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", csrfToken)
      .send({
        title: "Dezaakir Portfolio Platform",
        summary: "Full-stack Next.js & Bun platform with strict OWASP ASVS controls.",
        description: "<p>Built with Navy Blue and White brand identity.</p>",
        technologies: ["TypeScript", "Bun", "Next.js", "MongoDB"],
        status: "PUBLISHED",
        featured: true,
      });
    expect(projRes.status).toBe(201);

    const contactRes = await request(app).post("/api/contact").send({
      name: "Enterprise Client",
      email: "client@enterprise.io",
      subject: "Architecture Consultation",
      message: "We would like to discuss a distributed TypeScript & AI platform.",
    });
    expect(contactRes.status).toBe(201);

    // 2. Export signed database backup
    const backupBundle = await createDatabaseBackup();
    expect(backupBundle.version).toBe("1.0");
    expect(backupBundle.collections.users).toHaveLength(1);
    expect(backupBundle.collections.blogs).toHaveLength(1);
    expect(backupBundle.collections.projects).toHaveLength(1);
    expect(backupBundle.collections.contactMessages).toHaveLength(1);

    // 3. Verify tampered backup is rejected
    const tamperedBundle = JSON.parse(JSON.stringify(backupBundle));
    tamperedBundle.collections.blogs[0].title = "Tampered Title";
    await expect(restoreDatabaseBackup(tamperedBundle)).rejects.toThrow(
      /integrity check failed/i
    );

    // 4. Wipe database completely and verify public endpoints return 0 items
    await clearTestDatabase();
    const emptyBlogs = await request(app).get("/api/blogs");
    expect(emptyBlogs.body.data.blogs).toHaveLength(0);
    const emptyProjects = await request(app).get("/api/projects");
    expect(emptyProjects.body.data.projects).toHaveLength(0);

    // 5. Restore from authentic backup bundle and verify all records are recovered
    const restored = await restoreDatabaseBackup(backupBundle);
    expect(restored.restoredCounts.users).toBe(1);
    expect(restored.restoredCounts.blogs).toBe(1);
    expect(restored.restoredCounts.projects).toBe(1);
    expect(restored.restoredCounts.contactMessages).toBe(1);

    const restoredBlogs = await request(app).get("/api/blogs");
    expect(restoredBlogs.body.data.blogs).toHaveLength(1);
    expect(restoredBlogs.body.data.blogs[0].title).toBe("Zero-Trust Backup Architecture");

    const restoredProjects = await request(app).get("/api/projects");
    expect(restoredProjects.body.data.projects).toHaveLength(1);
    expect(restoredProjects.body.data.projects[0].title).toBe("Dezaakir Portfolio Platform");
  });

  it("enforces the strict two-color system (#0B1628 & #FFFFFF) and zero backend secrets in the frontend codebase", () => {
    const frontendRoot = path.resolve(process.cwd(), "../frontend");
    const files = collectFiles(frontendRoot, [".ts", ".tsx", ".css"]);
    expect(files.length).toBeGreaterThan(20);

    const forbiddenColorClasses =
      /\b(bg|text|border|ring|from|to|via)-(red|green|blue|purple|yellow|amber|emerald|teal|indigo|pink|rose|orange|cyan|lime|violet|fuchsia|sky|slate|gray|zinc|neutral|stone)-[0-9]{2,3}\b/;
    const forbiddenSecrets =
      /\b(SESSION_SECRET|OTP_HMAC_SECRET|MFA_ENCRYPTION_KEY|SMTP_APP_PASSWORD|CLOUDINARY_API_SECRET)\b/;

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(forbiddenColorClasses.test(content)).toBe(false);
      expect(forbiddenSecrets.test(content)).toBe(false);

      // Verify any hex colors in CSS/TSX are strictly #0B1628 or #FFFFFF
      const hexMatches = content.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
      for (const hex of hexMatches) {
        const upper = hex.toUpperCase();
        expect(["#0B1628", "#FFFFFF"]).toContain(upper);
      }
    }
  });
});
