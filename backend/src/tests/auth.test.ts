import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { resetRateLimits } from "../middleware/rateLimit.js";
import { EmailVerification, PasswordResetToken, Session, User } from "../models/index.js";
import { bootstrapAdmin } from "../scripts/create-admin.js";
import { clearCapturedEmails, getCapturedEmails } from "../services/email.service.js";
import { getSessionCookieOptions } from "../utils/cookies.js";
import { generateTotpCode } from "../utils/crypto.js";
import { clearTestDatabase, startTestDatabase, stopTestDatabase } from "./helpers/db.js";

const app = createApp();

const validRegistration = {
  name: "Dezaakir Visitor",
  email: "visitor@example.com",
  password: "StrongPassword!123",
  confirmPassword: "StrongPassword!123",
};

beforeAll(startTestDatabase, 300_000);
afterEach(async () => {
  resetRateLimits();
  clearCapturedEmails();
  await clearTestDatabase();
});
afterAll(stopTestDatabase);

describe("Phase 3: Registration & Email OTP Verification", () => {
  it("registers a PENDING user, hashes the OTP, and sends a Navy/White branded email", async () => {
    const res = await request(app).post("/api/auth/register").send(validRegistration);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const user = await User.findOne({ email: validRegistration.email }).select("+passwordHash").lean();
    expect(user).toBeTruthy();
    expect(user!.role).toBe("USER");
    expect(user!.emailVerified).toBe(false);
    expect(user!.status).toBe("PENDING");
    expect(user!.passwordHash).toStartWith("$argon2id$");

    const otpDoc = await EmailVerification.findOne({ user: user!._id }).select("+codeHash").lean();
    expect(otpDoc).toBeTruthy();

    const emails = getCapturedEmails();
    expect(emails.length).toBe(1);
    const otpCode = emails[0]!.meta?.codeOrToken!;
    expect(otpCode).toMatch(/^\d{6}$/);
    // Stored value is a 64-char hex HMAC, never the plaintext OTP
    expect(otpDoc!.codeHash).not.toBe(otpCode);
    expect(otpDoc!.codeHash).toMatch(/^[a-f0-9]{64}$/);
    // Brand check: email uses #0B1628 and #FFFFFF
    expect(emails[0]!.html).toContain("#0B1628");
    expect(emails[0]!.html).toContain("#FFFFFF");
  });

  it("rejects mass-assignment attempts (e.g. role=ADMIN in registration body)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, role: "ADMIN" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("prevents duplicate email registrations (Test Case #3)", async () => {
    await request(app).post("/api/auth/register").send(validRegistration);
    const dup = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, email: "VISITOR@example.com" });
    expect(dup.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
  });

  it("blocks login before email verification (Test Case #4)", async () => {
    await request(app).post("/api/auth/register").send(validRegistration);
    const res = await request(app).post("/api/auth/login").send({
      email: validRegistration.email,
      password: validRegistration.password,
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects invalid OTP codes and blocks after 5 failed attempts (Test Cases #5 & #8)", async () => {
    await request(app).post("/api/auth/register").send(validRegistration);

    for (let i = 1; i <= 4; i++) {
      const bad = await request(app).post("/api/auth/verify-email").send({
        email: validRegistration.email,
        code: "000000",
      });
      expect(bad.status).toBe(400);
      expect(bad.body.error.code).toBe("INVALID_OTP");
    }

    // 5th wrong attempt exhausts the OTP and deletes it
    const fifth = await request(app).post("/api/auth/verify-email").send({
      email: validRegistration.email,
      code: "000000",
    });
    expect(fifth.status).toBe(429);
    expect(fifth.body.error.code).toBe("OTP_MAX_ATTEMPTS");

    // Even the real code now fails because the OTP record was invalidated
    const realCode = getCapturedEmails()[0]!.meta?.codeOrToken!;
    const afterLock = await request(app).post("/api/auth/verify-email").send({
      email: validRegistration.email,
      code: realCode,
    });
    expect(afterLock.status).toBe(400);
  });

  it("rejects expired OTP codes (Test Case #6)", async () => {
    await request(app).post("/api/auth/register").send(validRegistration);
    const realCode = getCapturedEmails()[0]!.meta?.codeOrToken!;

    // Fast-forward expiration to the past
    await EmailVerification.updateOne({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).post("/api/auth/verify-email").send({
      email: validRegistration.email,
      code: realCode,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("OTP_EXPIRED");
  });

  it("verifies valid OTP, activates account, and prevents OTP reuse (Test Case #7)", async () => {
    await request(app).post("/api/auth/register").send(validRegistration);
    const realCode = getCapturedEmails()[0]!.meta?.codeOrToken!;

    const ok = await request(app).post("/api/auth/verify-email").send({
      email: validRegistration.email,
      code: realCode,
    });
    expect(ok.status).toBe(200);

    const user = await User.findOne({ email: validRegistration.email }).lean();
    expect(user!.emailVerified).toBe(true);
    expect(user!.status).toBe("ACTIVE");

    // Reusing the same OTP must fail
    const reuse = await request(app).post("/api/auth/verify-email").send({
      email: validRegistration.email,
      code: realCode,
    });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe("INVALID_OTP");
  });

  it("enforces 60-second resend cooldown and invalidates the previous OTP when reissued", async () => {
    await request(app).post("/api/auth/register").send(validRegistration);
    const firstCode = getCapturedEmails()[0]!.meta?.codeOrToken!;

    // Immediate resend is blocked by cooldown
    const tooSoon = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: validRegistration.email });
    expect(tooSoon.status).toBe(429);
    expect(tooSoon.body.error.code).toBe("OTP_COOLDOWN");

    // Backdate lastSentAt by 61 seconds
    await EmailVerification.updateOne({}, { $set: { lastSentAt: new Date(Date.now() - 61_000) } });

    const resent = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: validRegistration.email });
    expect(resent.status).toBe(200);

    const secondCode = getCapturedEmails()[1]!.meta?.codeOrToken!;
    if (secondCode !== firstCode) {
      const oldAttempt = await request(app).post("/api/auth/verify-email").send({
        email: validRegistration.email,
        code: firstCode,
      });
      expect(oldAttempt.status).toBe(400);
    }

    const newAttempt = await request(app).post("/api/auth/verify-email").send({
      email: validRegistration.email,
      code: secondCode,
    });
    expect(newAttempt.status).toBe(200);
  });
});

describe("Phase 3: Login, Sessions, Password Reset & Admin MFA", () => {
  async function createVerifiedUser() {
    await request(app).post("/api/auth/register").send(validRegistration);
    const otp = getCapturedEmails()[0]!.meta?.codeOrToken!;
    await request(app).post("/api/auth/verify-email").send({ email: validRegistration.email, code: otp });
    clearCapturedEmails();
  }

  it("locks account after 5 failed login attempts (Test Case #9)", async () => {
    await createVerifiedUser();

    for (let i = 1; i <= 5; i++) {
      const res = await request(app).post("/api/auth/login").send({
        email: validRegistration.email,
        password: "WrongPassword!999",
      });
      expect(res.status).toBe(401);
    }

    // Even with the right password, the account is now locked
    const locked = await request(app).post("/api/auth/login").send({
      email: validRegistration.email,
      password: validRegistration.password,
    });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("logs in, sets secure session cookies, lists sessions, and invalidates session on logout (Test Cases #17 & #23)", async () => {
    await createVerifiedUser();

    // Production cookie settings check (Test Case #23)
    const prodCookieOpts = getSessionCookieOptions(true);
    expect(prodCookieOpts.httpOnly).toBe(true);
    expect(prodCookieOpts.secure).toBe(true);
    expect(prodCookieOpts.sameSite).toBe("lax");

    const loginRes = await request(app).post("/api/auth/login").send({
      email: validRegistration.email,
      password: validRegistration.password,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.csrfToken).toBeString();
    expect(JSON.stringify(loginRes.body)).not.toContain("passwordHash");

    const setCookie = loginRes.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("dezaakir_sid=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    const cookieHeader = setCookie.split(";")[0]!;

    const meRes = await request(app).get("/api/auth/me").set("Cookie", cookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(validRegistration.email);

    const sessionsRes = await request(app).get("/api/auth/sessions").set("Cookie", cookieHeader);
    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.sessions.length).toBe(1);
    expect(sessionsRes.body.data.sessions[0].current).toBe(true);

    // Logout invalidates the session (Test Case #17)
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader)
      .set("X-CSRF-Token", loginRes.body.data.csrfToken);
    expect(logoutRes.status).toBe(200);

    const afterLogout = await request(app).get("/api/auth/me").set("Cookie", cookieHeader);
    expect(afterLogout.status).toBe(401);
  });

  it("resets password with a single-use token and invalidates existing sessions (Test Cases #16 & #18)", async () => {
    await createVerifiedUser();

    // Create an active session before password reset
    const loginRes = await request(app).post("/api/auth/login").send({
      email: validRegistration.email,
      password: validRegistration.password,
    });
    const cookieHeader = loginRes.headers["set-cookie"]![0]!.split(";")[0]!;

    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: validRegistration.email });
    expect(forgotRes.status).toBe(200);

    const resetToken = getCapturedEmails()[0]!.meta?.codeOrToken!;
    expect(resetToken).toBeString();

    // Database stores only a hash of the reset token
    const tokenDoc = await PasswordResetToken.findOne({}).select("+tokenHash").lean();
    expect(tokenDoc!.tokenHash).not.toBe(resetToken);

    const newPassword = "UpdatedPassword!456";
    const resetRes = await request(app).post("/api/auth/reset-password").send({
      token: resetToken,
      password: newPassword,
      confirmPassword: newPassword,
    });
    expect(resetRes.status).toBe(200);

    // Existing session is now invalidated (Test Case #18)
    const oldSessionCheck = await request(app).get("/api/auth/me").set("Cookie", cookieHeader);
    expect(oldSessionCheck.status).toBe(401);

    // Reset token cannot be reused (Test Case #16)
    const reuseRes = await request(app).post("/api/auth/reset-password").send({
      token: resetToken,
      password: "AnotherPassword!789",
      confirmPassword: "AnotherPassword!789",
    });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe("INVALID_RESET_TOKEN");

    // Can log in with the new password
    const newLogin = await request(app).post("/api/auth/login").send({
      email: validRegistration.email,
      password: newPassword,
    });
    expect(newLogin.status).toBe(200);
  });

  it("enforces TOTP MFA and single-use recovery codes for bootstrapped Administrator (Test Case #22)", async () => {
    const adminCredentials = {
      name: "Dezaakir Admin",
      email: "admin@dezaakir.com",
      password: "AdminStrongPassword!123",
    };
    const bootstrapped = await bootstrapAdmin(adminCredentials);

    // Login without TOTP is rejected with 401 MFA_REQUIRED
    const withoutMfa = await request(app).post("/api/auth/login").send({
      email: adminCredentials.email,
      password: adminCredentials.password,
    });
    expect(withoutMfa.status).toBe(401);
    expect(withoutMfa.body.error.code).toBe("MFA_REQUIRED");
    expect(await Session.countDocuments()).toBe(0);

    // Login with wrong TOTP code is rejected
    const badMfa = await request(app).post("/api/auth/login").send({
      email: adminCredentials.email,
      password: adminCredentials.password,
      totpCode: "000000",
    });
    expect(badMfa.status).toBe(401);

    // Login with valid TOTP code succeeds and marks session mfaVerified=true
    const validTotp = generateTotpCode(bootstrapped.totpSecret);
    const withTotp = await request(app).post("/api/auth/login").send({
      email: adminCredentials.email,
      password: adminCredentials.password,
      totpCode: validTotp,
    });
    expect(withTotp.status).toBe(200);
    expect(withTotp.body.data.session.mfaVerified).toBe(true);
    expect(withTotp.body.data.user.role).toBe("ADMIN");

    // Login with a single-use recovery code succeeds once, then is consumed
    const recoveryCode = bootstrapped.recoveryCodes[0]!;
    const withRecovery = await request(app).post("/api/auth/login").send({
      email: adminCredentials.email,
      password: adminCredentials.password,
      recoveryCode,
    });
    expect(withRecovery.status).toBe(200);

    const reuseRecovery = await request(app).post("/api/auth/login").send({
      email: adminCredentials.email,
      password: adminCredentials.password,
      recoveryCode,
    });
    expect(reuseRecovery.status).toBe(401);
  });
});
