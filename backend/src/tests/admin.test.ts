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

  it("supports role management, bulk contact actions, email preview/dispatch/history, and clean profile & login activity", async () => {
    const admin = await loginAdmin();
    const member = await registerAndLoginMember("upgrade-member@example.com");

    // 1. Non-admin cannot change roles
    const nonAdminRoleAttempt = await request(app)
      .patch(`/api/admin/users/${member.userId}/role`)
      .set("Cookie", member.cookie)
      .set("X-CSRF-Token", member.csrfToken)
      .send({ role: "ADMIN" });
    expect(nonAdminRoleAttempt.status).toBe(403);

    // 2. Admin cannot change own role
    const selfRoleAttempt = await request(app)
      .patch(`/api/admin/users/${admin.adminId}/role`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ role: "USER" });
    expect(selfRoleAttempt.status).toBe(400);
    expect(selfRoleAttempt.body.error.code).toBe("SELF_ROLE_CHANGE_FORBIDDEN");

    // 3. Admin promotes member to EDITOR and back to USER with audit log
    const promoteRes = await request(app)
      .patch(`/api/admin/users/${member.userId}/role`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ role: "EDITOR" });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.user.role).toBe("EDITOR");

    const demoteRes = await request(app)
      .patch(`/api/admin/users/${member.userId}/role`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ role: "USER" });
    expect(demoteRes.status).toBe(200);
    expect(demoteRes.body.data.user.role).toBe("USER");

    // 4. Bulk contact message actions (MARK_READ, MARK_UNREAD, DELETE_SELECTED, DELETE_ALL)
    await request(app).post("/api/contact").send({
      name: "Alice Sender",
      email: "alice@example.com",
      subject: "First Inquiry",
      message: "Hello from Alice about platform security.",
    });
    await request(app).post("/api/contact").send({
      name: "Bob Sender",
      email: "bob@example.com",
      subject: "Second Inquiry",
      message: "Hello from Bob about engineering.",
    });

    const msgList = await request(app)
      .get("/api/admin/messages")
      .set("Cookie", admin.cookie);
    expect(msgList.status).toBe(200);
    const ids = (msgList.body.data.messages as Array<{ id: string }>).map((m) => m.id);
    expect(ids).toHaveLength(2);

    const markReadRes = await request(app)
      .post("/api/admin/messages/bulk")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ action: "MARK_READ", ids: [ids[0]] });
    expect(markReadRes.status).toBe(200);
    expect(markReadRes.body.data.affectedCount).toBe(1);

    const markUnreadRes = await request(app)
      .post("/api/admin/messages/bulk")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ action: "MARK_UNREAD", ids: [ids[0]] });
    expect(markUnreadRes.status).toBe(200);
    expect(markUnreadRes.body.data.affectedCount).toBe(1);

    const deleteSelectedRes = await request(app)
      .post("/api/admin/messages/bulk")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ action: "DELETE_SELECTED", ids: [ids[0]] });
    expect(deleteSelectedRes.status).toBe(200);
    expect(deleteSelectedRes.body.data.affectedCount).toBe(1);

    const deleteAllRes = await request(app)
      .post("/api/admin/messages/bulk")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ action: "DELETE_ALL", confirm: true });
    expect(deleteAllRes.status).toBe(200);
    expect(deleteAllRes.body.data.affectedCount).toBe(1);

    const afterDeleteAll = await request(app)
      .get("/api/admin/messages")
      .set("Cookie", admin.cookie);
    expect(afterDeleteAll.status).toBe(200);
    expect(afterDeleteAll.body.data.counts.total).toBe(0);

    // 5. Email preview, dispatch & history
    const previewRes = await request(app)
      .post("/api/admin/emails/preview")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        subject: "Dezaakir Platform Update",
        bodyHtml: "<p>Important security update for our members.</p>",
      });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.html).toContain("#0B1628");
    expect(previewRes.body.data.html).toContain("Important security update");

    const sendRes = await request(app)
      .post("/api/admin/emails/send")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        recipientMode: "SINGLE",
        recipientIds: [member.userId],
        subject: "Individual Security Notice",
        bodyHtml: "<p>Hello member, your account preferences are active.</p>",
      });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.campaign.sentCount).toBe(1);
    expect(sendRes.body.data.campaign.failedCount).toBe(0);

    const historyRes = await request(app)
      .get("/api/admin/emails/history")
      .set("Cookie", admin.cookie);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.campaigns).toHaveLength(1);
    expect(historyRes.body.data.campaigns[0].subject).toBe("Individual Security Notice");

    // 6. Profile update & clean login activity (no raw User-Agent strings)
    const profileUpdateRes = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", member.cookie)
      .set("X-CSRF-Token", member.csrfToken)
      .send({
        name: "Updated Member Name",
        bio: "Systems Engineer",
        location: "Riyadh",
        preferences: {
          securityAlerts: true,
          emailNotifications: false,
        },
      });
    expect(profileUpdateRes.status).toBe(200);
    expect(profileUpdateRes.body.data.user.name).toBe("Updated Member Name");
    expect(profileUpdateRes.body.data.user.bio).toBe("Systems Engineer");
    expect(profileUpdateRes.body.data.user.preferences.emailNotifications).toBe(false);

    const activityRes = await request(app)
      .get("/api/auth/login-activity")
      .set("Cookie", member.cookie)
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0");
    expect(activityRes.status).toBe(200);
    expect(Array.isArray(activityRes.body.data.activity)).toBe(true);
    expect(activityRes.body.data.activity.length).toBeGreaterThanOrEqual(1);
    const firstActivity = activityRes.body.data.activity[0] as Record<string, unknown>;
    expect(firstActivity.deviceName).toBeDefined();
    expect(firstActivity.userAgent).toBeUndefined();
    expect(String(firstActivity.deviceName)).not.toContain("Mozilla/5.0");
  });
});
