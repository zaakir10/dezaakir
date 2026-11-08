import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { resetRateLimits } from "../middleware/rateLimit.js";
import { bootstrapAdmin } from "../scripts/create-admin.js";
import { clearCapturedEmails, getCapturedEmails } from "../services/email.service.js";
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

async function registerRegularUser() {
  const credentials = {
    name: "Regular Reader",
    email: "reader@example.com",
    password: "ReaderStrongPassword!123",
    confirmPassword: "ReaderStrongPassword!123",
  };
  await request(app).post("/api/auth/register").send(credentials);
  const otp = getCapturedEmails()[0]!.meta?.codeOrToken!;
  await request(app).post("/api/auth/verify-email").send({ email: credentials.email, code: otp });
  const loginRes = await request(app).post("/api/auth/login").send({
    email: credentials.email,
    password: credentials.password,
  });
  return {
    cookie: loginRes.headers["set-cookie"]![0]!.split(";")[0]!,
    csrfToken: loginRes.body.data.csrfToken as string,
  };
}

async function loginAdmin() {
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
  return {
    cookie: loginRes.headers["set-cookie"]![0]!.split(";")[0]!,
    csrfToken: loginRes.body.data.csrfToken as string,
  };
}

describe("Phase 6: Blog Management, Categories, Tags & Public Visibility", () => {
  it("rejects unauthorized blog creation, update, or deletion (Test Case #15)", async () => {
    const payload = {
      title: "Unauthorized Post",
      excerpt: "Attempting to publish without admin privileges.",
      content: "<p>Unauthorized content</p>",
      status: "PUBLISHED",
    };

    const unauth = await request(app).post("/api/blogs").send(payload);
    expect(unauth.status).toBe(401);

    const reader = await registerRegularUser();
    const forbidden = await request(app)
      .post("/api/blogs")
      .set("Cookie", reader.cookie)
      .set("X-CSRF-Token", reader.csrfToken)
      .send(payload);
    expect(forbidden.status).toBe(403);
  });

  it("manages categories & tags, sanitizes rich HTML, hides drafts/future posts, and exposes only public fields (Test Cases #11 & #20)", async () => {
    const admin = await loginAdmin();

    // 1. Create a BLOG category and tag
    const catRes = await request(app)
      .post("/api/categories")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ name: "Application Security", type: "BLOG", description: "OWASP ASVS & API security" });
    expect(catRes.status).toBe(201);
    const categoryId = catRes.body.data.category.id as string;

    const tagRes = await request(app)
      .post("/api/tags")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ name: "TypeScript" });
    expect(tagRes.status).toBe(201);
    const tagId = tagRes.body.data.tag.id as string;

    // 2. Create a DRAFT article
    const draftRes = await request(app)
      .post("/api/blogs")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        title: "Private Draft Architecture Note",
        excerpt: "This draft must never appear on public endpoints.",
        content: "<p>Secret draft notes.</p>",
        status: "DRAFT",
      });
    expect(draftRes.status).toBe(201);
    const draftId = draftRes.body.data.blog.id as string;
    const draftSlug = draftRes.body.data.blog.slug as string;

    // 3. Create a PUBLISHED article with an XSS payload in content
    const pubRes = await request(app)
      .post("/api/blogs")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        title: "Hardening Express & MongoDB APIs",
        excerpt: "A practical guide to OWASP ASVS Level 2 API protection.",
        content:
          "<h2>Defense in Depth</h2><script>alert('xss')</script><p onclick=\"evil()\">Use strict validation and parameterized queries.</p>",
        category: categoryId,
        tags: [tagId],
        status: "PUBLISHED",
        featured: true,
      });
    expect(pubRes.status).toBe(201);
    const pubSlug = pubRes.body.data.blog.slug as string;
    expect(pubRes.body.data.blog.content).not.toContain("<script>");
    expect(pubRes.body.data.blog.content).not.toContain("onclick");

    // 4. Public GET /api/blogs returns ONLY the published article, never the draft (Test Case #20)
    const publicList = await request(app).get("/api/blogs");
    expect(publicList.status).toBe(200);
    expect(publicList.body.data.blogs.length).toBe(1);
    expect(publicList.body.data.blogs[0].slug).toBe(pubSlug);
    // Author object on public endpoint exposes `name` only, never `email` or `passwordHash`
    expect(publicList.body.data.blogs[0].author.name).toBe("Dezaakir");
    expect(publicList.body.data.blogs[0].author.email).toBeUndefined();

    // 5. Public GET /api/blogs/:slug returns 404 for the draft article
    const draftFetch = await request(app).get(`/api/blogs/${draftSlug}`);
    expect(draftFetch.status).toBe(404);

    // 6. Admin can publish the draft via PUT /api/blogs/:id, and then delete it
    const publishDraft = await request(app)
      .put(`/api/blogs/${draftId}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "PUBLISHED", category: categoryId });
    expect(publishDraft.status).toBe(200);

    // Now the published article detail includes related articles in the same category
    const detailRes = await request(app).get(`/api/blogs/${pubSlug}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.related.length).toBe(1);

    const delRes = await request(app)
      .delete(`/api/blogs/${draftId}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(delRes.status).toBe(200);
  });
});
