import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { startTestDatabase, clearTestDatabase, stopTestDatabase } from "./helpers/db.js";
import {
  AuditLog,
  Blog,
  Category,
  ContactMessage,
  EmailVerification,
  Session,
  SiteSettings,
  User,
  Project,
} from "../models/index.js";
import { assertSecureUri } from "../config/database.js";
import { normalizePage, escapeRegex, toObjectId } from "../utils/query.js";
import { slugify, readingTimeMinutes, htmlToPlainText } from "../utils/text.js";

const userData = (overrides: Record<string, unknown> = {}) => ({
  name: "Test User",
  email: "Test.User@Example.com ",
  passwordHash: "$argon2id$v=19$m=65536,t=2,p=1$placeholderhashvalue",
  ...overrides,
});

beforeAll(startTestDatabase, 300_000);
afterEach(clearTestDatabase);
afterAll(stopTestDatabase);

describe("Database connection security", () => {
  it("refuses non-TLS URIs in production", () => {
    expect(() => assertSecureUri("mongodb://host:27017/db", true)).toThrow();
    expect(() => assertSecureUri("mongodb+srv://u:p@c.mongodb.net/db?tls=false", true)).toThrow();
    expect(() => assertSecureUri("mongodb+srv://u:p@c.mongodb.net/db?tlsAllowInvalidCertificates=true", true)).toThrow();
    expect(() => assertSecureUri("mongodb+srv://u:p@c.mongodb.net/db", true)).not.toThrow();
    expect(() => assertSecureUri("mongodb://host:27017/db?tls=true", true)).not.toThrow();
  });
});

describe("User model", () => {
  it("normalises email and defaults to an unverified USER in PENDING status", async () => {
    const user = await User.create(userData());
    expect(user.email).toBe("test.user@example.com");
    expect(user.role).toBe("USER");
    expect(user.emailVerified).toBe(false);
    expect(user.status).toBe("PENDING");
  });

  it("prevents duplicate emails (case-insensitive)", async () => {
    await User.create(userData());
    expect(User.create(userData({ email: "TEST.USER@example.com" }))).rejects.toThrow(/duplicate key/);
  });

  it("never selects or serialises the password hash or MFA secrets", async () => {
    const created = await User.create(
      userData({ mfa: { enabled: true, secretEncrypted: "enc", recoveryCodeHashes: ["a"] } }),
    );
    const json = JSON.stringify(created.toJSON());
    expect(json).not.toContain("passwordHash");
    expect(json).not.toContain("secretEncrypted");
    expect(json).not.toContain("recoveryCodeHashes");

    const fetched = await User.findById(created._id).lean();
    expect(fetched).not.toHaveProperty("passwordHash");
    const withHash = await User.findById(created._id).select("+passwordHash").lean();
    expect(withHash?.passwordHash).toStartWith("$argon2id$");
  });

  it("rejects unknown fields (mass-assignment defence)", async () => {
    expect(User.create(userData({ isSuperAdmin: true }))).rejects.toThrow();
  });

  it("rejects invalid roles", async () => {
    expect(User.create(userData({ role: "ROOT" }))).rejects.toThrow();
  });
});

describe("NoSQL injection defence (sanitizeFilter)", () => {
  it("neutralises operator objects injected into filters", async () => {
    await User.create(userData());
    const injected = { $ne: "nobody@example.com" } as unknown as string;
    // sanitizeFilter wraps the injected operator in $eq, which then fails String casting rather than executing $ne.
    await expect(User.findOne({ email: injected }).exec()).rejects.toThrow(/Cast to string failed/);
  });

  it("strips filter paths not defined in the schema (strictQuery)", async () => {
    await User.create(userData());
    const found = await User.find({ notAField: "x" } as Record<string, unknown>);
    // Unknown path removed → behaves like an empty filter, never reaches MongoDB as-is.
    expect(found.length).toBe(1);
  });
});

describe("TTL indexes for automatic cleanup", () => {
  const ttlFields = async (model: mongoose.Model<any>) =>
    (await model.collection.indexes())
      .filter((i) => typeof i.expireAfterSeconds === "number")
      .map((i) => Object.keys(i.key)[0]);

  it("expires OTPs, sessions, and audit logs automatically", async () => {
    expect(await ttlFields(EmailVerification)).toContain("expiresAt");
    expect(await ttlFields(Session)).toContain("expiresAt");
    expect(await ttlFields(AuditLog)).toContain("createdAt");
  });

  it("enforces one active OTP per user", async () => {
    const user = await User.create(userData());
    const base = { user: user._id, codeHash: "h", lastSentAt: new Date(), expiresAt: new Date(Date.now() + 600_000) };
    await EmailVerification.create(base);
    expect(EmailVerification.create(base)).rejects.toThrow(/duplicate key/);
  });

  it("hides session token hashes from serialisation", async () => {
    const user = await User.create(userData());
    const s = await Session.create({
      user: user._id,
      tokenHash: "secret-hash",
      csrfTokenHash: "csrf-hash",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    expect(JSON.stringify(s.toJSON())).not.toContain("secret-hash");
    expect(JSON.stringify(s.toJSON())).not.toContain("csrf-hash");
  });
});

describe("Blog visibility", () => {
  it("publicFilter returns only published or due-scheduled posts", async () => {
    const author = await User.create(userData());
    const base = { excerpt: "Excerpt", content: "<p>Body</p>", author: author._id };
    await Blog.create([
      { ...base, title: "Draft post", slug: "draft-post", status: "DRAFT" },
      { ...base, title: "Published post", slug: "published-post", status: "PUBLISHED" },
      { ...base, title: "Due scheduled", slug: "due-scheduled", status: "SCHEDULED", publishedAt: new Date(Date.now() - 1000) },
      { ...base, title: "Future scheduled", slug: "future-scheduled", status: "SCHEDULED", publishedAt: new Date(Date.now() + 86_400_000) },
    ]);
    const visible = await Blog.find(Blog.publicFilter()).sort({ slug: 1 }).lean();
    expect(visible.map((b) => b.slug)).toEqual(["due-scheduled", "published-post"]);
  });

  it("rejects scheduled posts without a date and invalid slugs", async () => {
    const author = await User.create(userData());
    const base = { title: "Title here", excerpt: "E", content: "<p>x</p>", author: author._id };
    expect(Blog.create({ ...base, slug: "ok-slug", status: "SCHEDULED" })).rejects.toThrow(/publication date/);
    expect(Blog.create({ ...base, slug: "Bad Slug!" })).rejects.toThrow();
  });
});

describe("Project, Category, Contact and Settings", () => {
  it("only accepts https GitHub/live URLs", async () => {
    const base = { title: "Proj", slug: "proj", summary: "S", description: "<p>D</p>" };
    expect(Project.create({ ...base, githubUrl: "javascript:alert(1)" })).rejects.toThrow();
    expect(Project.create({ ...base, liveUrl: "http://insecure.example" })).rejects.toThrow();
    const ok = await Project.create({ ...base, githubUrl: "https://github.com/dezaakir/proj", liveUrl: "https://proj.example" });
    expect(ok.status).toBe("DRAFT");
  });

  it("scopes category slugs per type", async () => {
    await Category.create({ name: "Web", slug: "web", type: "BLOG" });
    await Category.create({ name: "Web", slug: "web", type: "PROJECT" });
    expect(Category.create({ name: "Web 2", slug: "web", type: "BLOG" })).rejects.toThrow(/duplicate key/);
  });

  it("rejects CR/LF in contact subjects (header injection)", async () => {
    const msg = { name: "Ali", email: "a@b.co", message: "Hello there, this is a message." };
    expect(ContactMessage.create({ ...msg, subject: "Hi\r\nBcc: victim@x.com" })).rejects.toThrow();
    const ok = await ContactMessage.create({ ...msg, subject: "Hello" });
    expect(ok.status).toBe("NEW");
  });

  it("SiteSettings is a race-safe singleton", async () => {
    const [a, b] = await Promise.all([SiteSettings.getSingleton(), SiteSettings.getSingleton()]);
    expect(String(a._id)).toBe(String(b._id));
    expect(await SiteSettings.countDocuments()).toBe(1);
    expect(a.siteTitle).toBe("Dezaakir");
  });

  it("audit logs are append-only", async () => {
    const log = await AuditLog.create({ category: "AUTH", action: "auth.login", outcome: "SUCCESS" });
    await expect(AuditLog.updateOne({ _id: log._id }, { $set: { outcome: "FAILURE" } }).exec()).rejects.toThrow(
      /append-only/,
    );
  });
});

describe("Query and text utilities", () => {
  it("clamps pagination", () => {
    expect(normalizePage("-5", "1000")).toEqual({ page: 1, limit: 50 });
    expect(normalizePage("abc", undefined)).toEqual({ page: 1, limit: 10 });
    expect(normalizePage("3", "20")).toEqual({ page: 3, limit: 20 });
  });

  it("escapes regex input and validates ObjectIds", () => {
    expect(escapeRegex("a.*(b)")).toBe("a\\.\\*\\(b\\)");
    expect(() => toObjectId({ $gt: "" })).toThrow();
    expect(() => toObjectId("not-an-id")).toThrow();
    expect(String(toObjectId("507f1f77bcf86cd799439011"))).toBe("507f1f77bcf86cd799439011");
  });

  it("slugifies and computes reading time", () => {
    expect(slugify("  Hello, Wörld! Next.js & AI  ")).toBe("hello-world-next-js-ai");
    expect(readingTimeMinutes("word ".repeat(450))).toBe(2);
    expect(htmlToPlainText("<h1>Title</h1><p>a &amp; b</p>")).toBe("Title a & b");
  });
});
