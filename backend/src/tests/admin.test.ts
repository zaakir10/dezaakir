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
});
