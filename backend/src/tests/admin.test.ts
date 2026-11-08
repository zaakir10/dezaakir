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

async function registerAndLoginMember(email = "member@example.com") {
  const credentials = {
    name: "Community Member",
    email,
    password: "MemberStrongPassword!123",
    confirmPassword: "MemberStrongPassword!123",
  };
  await request(app).post("/api/auth/register").send(credentials);
  const otp = getCapturedEmails().at(-1)!.meta?.codeOrToken!;
  await request(app).post("/api/auth/verify-email").send({ email: credentials.email, code: otp });
  const loginRes = await request(app).post("/api/auth/login").send({
    email: credentials.email,
    password: credentials.password,
  });
  return {
    userId: loginRes.body.data.user.id as string,
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
    adminId: loginRes.body.data.user.id as string,
    cookie: loginRes.headers["set-cookie"]![0]!.split(";")[0]!,
    csrfToken: loginRes.body.data.csrfToken as string,
  };
}

describe("Phase 8: Admin Overview, User Management & Audit Logs", () => {
  it("blocks unauthenticated and regular users from overview, user management, and audit logs", async () => {
    const unauthOverview = await request(app).get("/api/admin/overview");
    expect(unauthOverview.status).toBe(401);

    const member = await registerAndLoginMember();
    const forbiddenOverview = await request(app)
      .get("/api/admin/overview")
      .set("Cookie", member.cookie);
    expect(forbiddenOverview.status).toBe(403);

    const forbiddenUsers = await request(app)
      .get("/api/admin/users")
      .set("Cookie", member.cookie);
    expect(forbiddenUsers.status).toBe(403);

    const forbiddenLogs = await request(app)
      .get("/api/admin/audit-logs")
      .set("Cookie", member.cookie);
    expect(forbiddenLogs.status).toBe(403);
  });

  it("returns overview metrics, manages user status & session revocation without exposing secrets, and prevents admin self-lockout", async () => {
    const admin = await loginAdmin();
    const member = await registerAndLoginMember("developer@example.com");

    // 1. Overview metrics
    const overviewRes = await request(app)
      .get("/api/admin/overview")
      .set("Cookie", admin.cookie);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.stats.totalUsers).toBe(2);
    expect(Array.isArray(overviewRes.body.data.recentActivity)).toBe(true);

    // 2. List users and verify secret fields are stripped
    const listRes = await request(app)
      .get("/api/admin/users?search=developer")
      .set("Cookie", admin.cookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.users).toHaveLength(1);
    const listedUser = listRes.body.data.users[0];
    expect(listedUser.email).toBe("developer@example.com");
    expect(listedUser.passwordHash).toBeUndefined();

    // 3. View user details + active sessions without token hashes
    const detailRes = await request(app)
      .get(`/api/admin/users/${member.userId}`)
      .set("Cookie", admin.cookie);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.user.passwordHash).toBeUndefined();
    expect(detailRes.body.data.sessions.length).toBeGreaterThanOrEqual(1);
    expect(detailRes.body.data.sessions[0].tokenHash).toBeUndefined();
    expect(detailRes.body.data.sessions[0].csrfTokenHash).toBeUndefined();

    // 4. Prevent admin from suspending their own account
    const selfSuspendRes = await request(app)
      .patch(`/api/admin/users/${admin.adminId}/status`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "SUSPENDED" });
    expect(selfSuspendRes.status).toBe(400);
    expect(selfSuspendRes.body.error.code).toBe("SELF_LOCKOUT_FORBIDDEN");

    // 5. Suspend member account -> automatically revokes their active sessions
    const suspendRes = await request(app)
      .patch(`/api/admin/users/${member.userId}/status`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "SUSPENDED" });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.status).toBe("SUSPENDED");
    expect(suspendRes.body.data.revokedSessions).toBeGreaterThanOrEqual(1);

    // 6. Member's existing session cookie is now rejected
    const memberMeAfterSuspend = await request(app)
      .get("/api/auth/me")
      .set("Cookie", member.cookie);
    expect(memberMeAfterSuspend.status).toBe(401);

    // 7. Reactivate member account
    const reactivateRes = await request(app)
      .patch(`/api/admin/users/${member.userId}/status`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "ACTIVE" });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.user.status).toBe("ACTIVE");

    // 8. Audit logs record the admin actions
    const logsRes = await request(app)
      .get("/api/admin/audit-logs?category=ADMIN")
      .set("Cookie", admin.cookie);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data.logs.length).toBeGreaterThanOrEqual(2);
  });

  it("supports enterprise dashboard features: overview series, taxonomy update & usageCount, bulk blog actions, message deletion, and extended settings", async () => {
    const admin = await loginAdmin();

    // 1. Create & update Category and Tag, verify usageCount
    const catRes = await request(app)
      .post("/api/categories")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ name: "Systems Architecture", type: "BLOG", description: "Initial desc" });
    expect(catRes.status).toBe(201);
    const catId = catRes.body.data.category.id as string;

    const updateCatRes = await request(app)
      .put(`/api/categories/${catId}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ name: "Distributed Systems", description: "Updated desc" });
    expect(updateCatRes.status).toBe(200);
    expect(updateCatRes.body.data.category.name).toBe("Distributed Systems");

    const tagRes = await request(app)
      .post("/api/tags")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ name: "TypeScript" });
    expect(tagRes.status).toBe(201);
    const tagId = tagRes.body.data.tag.id as string;

    const updateTagRes = await request(app)
      .put(`/api/tags/${tagId}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ name: "Strict TypeScript" });
    expect(updateTagRes.status).toBe(200);
    expect(updateTagRes.body.data.tag.name).toBe("Strict TypeScript");

    // 2. Create two draft blog posts in that category/tag and run bulk PUBLISH + DELETE
    const blog1 = await request(app)
      .post("/api/admin/blogs")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        title: "First Enterprise Blog Post",
        excerpt: "Summary of first post",
        content: "<p>Detailed technical content for first post.</p>",
        category: catId,
        tags: [tagId],
        status: "DRAFT",
      });
    expect(blog1.status).toBe(201);
    const blog1Id = blog1.body.data.blog.id as string;

    const blog2 = await request(app)
      .post("/api/admin/blogs")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        title: "Second Enterprise Blog Post",
        excerpt: "Summary of second post",
        content: "<p>Detailed technical content for second post.</p>",
        category: catId,
        tags: [tagId],
        status: "DRAFT",
      });
    expect(blog2.status).toBe(201);
    const blog2Id = blog2.body.data.blog.id as string;

    // Verify usageCount on categories and tags
    const listCats = await request(app).get("/api/categories");
    expect(listCats.status).toBe(200);
    expect(listCats.body.data.categories[0].usageCount).toBe(2);

    const listTags = await request(app).get("/api/tags");
    expect(listTags.status).toBe(200);
    expect(listTags.body.data.tags[0].usageCount).toBe(2);

    // Bulk PUBLISH
    const bulkPub = await request(app)
      .post("/api/admin/blogs/bulk")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ ids: [blog1Id, blog2Id], action: "PUBLISH" });
    expect(bulkPub.status).toBe(200);
    expect(bulkPub.body.data.affected).toBe(2);

    // Bulk DELETE
    const bulkDel = await request(app)
      .post("/api/admin/blogs/bulk")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ ids: [blog2Id], action: "DELETE" });
    expect(bulkDel.status).toBe(200);
    expect(bulkDel.body.data.affected).toBe(1);

    // 3. Submit contact message and delete it via admin endpoint
    const contactRes = await request(app).post("/api/contact").send({
      name: "Enterprise Inquiry",
      email: "client@example.com",
      subject: "Architecture Consulting",
      message: "We would like to discuss a platform engineering engagement.",
    });
    expect(contactRes.status).toBe(201);

    const messagesList = await request(app)
      .get("/api/admin/messages?search=Architecture")
      .set("Cookie", admin.cookie);
    expect(messagesList.status).toBe(200);
    expect(messagesList.body.data.messages).toHaveLength(1);
    const msgId = messagesList.body.data.messages[0].id as string;

    const delMsg = await request(app)
      .delete(`/api/admin/messages/${msgId}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(delMsg.status).toBe(200);
    expect(delMsg.body.data.deleted).toBe(true);

    // 4. Update site settings with authorName, facebook, and tiktok
    const settingsRes = await request(app)
      .put("/api/admin/settings")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        siteTitle: "Dezaakir",
        authorName: "Zaakir",
        socialLinks: {
          github: "https://github.com/dezaakir",
          facebook: "https://facebook.com/dezaakir",
          tiktok: "https://tiktok.com/@dezaakir",
        },
      });
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.data.settings.authorName).toBe("Zaakir");
    expect(settingsRes.body.data.settings.socialLinks.facebook).toBe("https://facebook.com/dezaakir");

    // 5. Verify overview monthlySeries and comparisons
    const ov = await request(app)
      .get("/api/admin/overview")
      .set("Cookie", admin.cookie);
    expect(ov.status).toBe(200);
    expect(ov.body.data.stats.blogs.total).toBe(1);
    expect(ov.body.data.monthlySeries).toHaveLength(6);
    expect(ov.body.data.systemStatus).toBeDefined();
  });
});
