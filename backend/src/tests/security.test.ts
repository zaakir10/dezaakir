import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { resetRateLimits } from "../middleware/rateLimit.js";
import { AuditLog, ContactMessage } from "../models/index.js";
import { bootstrapAdmin } from "../scripts/create-admin.js";
import { clearCapturedEmails, getCapturedEmails } from "../services/email.service.js";
import { generateTotpCode } from "../utils/crypto.js";
import { sanitizeRichHtml } from "../utils/sanitizeHtml.js";
import { clearTestDatabase, startTestDatabase, stopTestDatabase } from "./helpers/db.js";

const app = createApp();

beforeAll(startTestDatabase, 300_000);
afterEach(async () => {
  resetRateLimits();
  clearCapturedEmails();
  await clearTestDatabase();
});
afterAll(stopTestDatabase);

async function registerAndLoginRegularUser() {
  const credentials = {
    name: "Regular User",
    email: "user@example.com",
    password: "UserStrongPassword!123",
    confirmPassword: "UserStrongPassword!123",
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

async function createAndLoginAdmin() {
  const credentials = {
    name: "Site Admin",
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

describe("Phase 4: RBAC, CSRF, NoSQL Injection, XSS & Contact Security", () => {
  it("blocks unauthenticated and regular users from administrator APIs (Test Cases #1 & #2)", async () => {
    const unauth = await request(app).get("/api/admin/messages");
    expect(unauth.status).toBe(401);

    const user = await registerAndLoginRegularUser();
    const forbidden = await request(app).get("/api/admin/messages").set("Cookie", user.cookie);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");

    // Permission denial is recorded in AuditLog
    const denialLog = await AuditLog.findOne({ action: "auth.permission_denied" }).lean();
    expect(denialLog).toBeTruthy();
    expect(denialLog!.outcome).toBe("DENIED");
  });

  it("rejects NoSQL operator injection attempts in request payloads (Test Case #10)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: { $ne: "nobody@example.com" },
        password: { $gt: "" },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NOSQL_INJECTION_DETECTED");

    const audit = await AuditLog.findOne({ action: "security.nosql_injection_blocked" }).lean();
    expect(audit).toBeTruthy();
  });

  it("rejects CSRF attacks with missing/invalid tokens or cross-site Origins (Test Case #12)", async () => {
    const user = await registerAndLoginRegularUser();

    // 1. Authenticated PATCH without X-CSRF-Token is rejected
    const missingToken = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", user.cookie)
      .send({ name: "Hacked Name" });
    expect(missingToken.status).toBe(403);
    expect(missingToken.body.error.code).toBe("CSRF_TOKEN_INVALID");

    // 2. Authenticated PATCH with forged X-CSRF-Token is rejected
    const forgedToken = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", user.cookie)
      .set("X-CSRF-Token", "forged-csrf-token-0123456789abcdef")
      .send({ name: "Hacked Name" });
    expect(forgedToken.status).toBe(403);
    expect(forgedToken.body.error.code).toBe("CSRF_TOKEN_INVALID");

    // 3. Cross-origin Origin header is rejected even if token is present
    const badOrigin = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", user.cookie)
      .set("X-CSRF-Token", user.csrfToken)
      .set("Origin", "https://evil.example")
      .send({ name: "Hacked Name" });
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.body.error.code).toBe("CSRF_ORIGIN_MISMATCH");

    // 4. Legitimate request with matching Origin and valid X-CSRF-Token succeeds
    const validReq = await request(app)
      .patch("/api/auth/me")
      .set("Cookie", user.cookie)
      .set("X-CSRF-Token", user.csrfToken)
      .set("Origin", "http://localhost:3000")
      .send({ name: "Updated Name" });
    expect(validReq.status).toBe(200);
    expect(validReq.body.data.user.name).toBe("Updated Name");
  });

  it("neutralizes stored and reflected XSS payloads in rich HTML and contact messages (Test Case #11)", async () => {
    const dirtyHtml = `
      <h2>Architecture Notes</h2>
      <script>alert('xss')</script>
      <p onclick="alert(1)" style="background:url(javascript:alert(1))">Safe paragraph</p>
      <a href="javascript:alert(2)" target="_blank">Malicious Link</a>
      <a href="https://dezaakir.com/blog" target="_blank">Valid Link</a>
      <img src="x" onerror="alert(3)" />
      <img src="https://res.cloudinary.com/demo/image/upload/sample.jpg" alt="Diagram" onerror="alert(4)" />
      <svg onload="alert(5)"><circle /></svg>
      <iframe src="https://evil.example"></iframe>
    `;
    const clean = sanitizeRichHtml(dirtyHtml);
    expect(clean).toContain("<h2>Architecture Notes</h2>");
    expect(clean).toContain("<p>Safe paragraph</p>");
    expect(clean).toContain('href="https://dezaakir.com/blog"');
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("<svg");
    expect(clean).not.toContain("<iframe");

    // Contact form XSS payload is escaped before storage
    const contactRes = await request(app).post("/api/contact").send({
      name: "<script>alert(1)</script>Ali",
      email: "ali@example.com",
      subject: "Security <img src=x onerror=alert(1)>",
      message: "Hello <script>stealCookies()</script> world, testing XSS neutralization.",
    });
    expect(contactRes.status).toBe(201);

    const saved = await ContactMessage.findOne({ email: "ali@example.com" }).lean();
    expect(saved).toBeTruthy();
    expect(saved!.name).not.toContain("<script>");
    expect(saved!.name).toContain("&lt;script&gt;");
    expect(saved!.subject).not.toContain("<img");
    expect(saved!.message).not.toContain("<script>");
  });

  it("drops honeypot spam silently, rate-limits contact spam, and allows Admin to manage messages (Test Case #21)", async () => {
    // 1. Honeypot spam is silently dropped without saving to MongoDB
    const botRes = await request(app).post("/api/contact").send({
      name: "Spam Bot",
      email: "bot@spam.example",
      subject: "Cheap links",
      message: "Buy spam links right now from our automated bot.",
      website: "https://spam.example",
    });
    expect(botRes.status).toBe(201);
    expect(await ContactMessage.countDocuments()).toBe(0);

    // 2. Rate limiting blocks excessive contact submissions (5 allowed, 6th blocked with 429)
    resetRateLimits();
    for (let i = 1; i <= 5; i++) {
      const ok = await request(app).post("/api/contact").send({
        name: "Sender",
        email: `sender${i}@example.com`,
        subject: `Inquiry #${i}`,
        message: "This is a legitimate project inquiry message.",
      });
      expect(ok.status).toBe(201);
    }

    const sixth = await request(app).post("/api/contact").send({
      name: "Sender",
      email: "sender6@example.com",
      subject: "Inquiry #6",
      message: "This sixth submission exceeds the rate limit.",
    });
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe("RATE_LIMITED");
    expect(sixth.headers["retry-after"]).toBeString();

    // 3. Admin with verified MFA can list and update message status
    const admin = await createAndLoginAdmin();
    const listRes = await request(app).get("/api/admin/messages").set("Cookie", admin.cookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.messages.length).toBe(5);
    expect(listRes.body.meta.total).toBe(5);

    const firstId = listRes.body.data.messages[0].id as string;
    const patchRes = await request(app)
      .patch(`/api/admin/messages/${firstId}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "READ" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.message.status).toBe("READ");
  });
});
