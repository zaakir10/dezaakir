import type { Request } from "express";
import { env, isTest } from "../config/env.js";
import {
  AuditLog,
  EmailVerification,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  PasswordResetToken,
  RESET_TOKEN_TTL_MS,
  Session,
  User,
  type IAuditLog,
  type ISession,
  type IUser,
} from "../models/index.js";
import { deriveCsrfToken } from "../middleware/auth.js";
import { evaluateUserSuspension } from "./moderation.service.js";
import { AppError } from "../utils/AppError.js";
import { SESSION_TTL_MS } from "../utils/cookies.js";
import {
  buildOtpAuthUri,
  decryptSecret,
  encryptSecret,
  generateOtpCode,
  generateRecoveryCodes,
  generateToken,
  generateTotpSecret,
  hashOtp,
  hashPassword,
  hashRecoveryCode,
  hashToken,
  safeEqual,
  verifyDummyPassword,
  verifyPassword,
  verifyTotpCode,
} from "../utils/crypto.js";
import { verifyUploadedImage } from "../utils/fileValidation.js";
import { toObjectId, trusted } from "../utils/query.js";
import { sanitizePlainText } from "../utils/sanitizeHtml.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  RequestEmailChangeInput,
  ResendVerificationInput,
  ResetPasswordInput,
  UpdateProfileInput,
  UploadAvatarInput,
  VerifyEmailChangeInput,
  VerifyEmailInput,
} from "../validators/auth.validator.js";
import { recordAudit } from "./audit.service.js";
import {
  sendPasswordResetEmail,
  sendSecurityNotificationEmail,
  sendVerificationOtpEmail,
  sendWelcomeEmail,
} from "./email.service.js";
import { createSignedCloudinaryParams } from "./media.service.js";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Converts a raw HTTP User-Agent string into a clean, human-readable device name.
 * Never returns raw Mozilla/5.0 or technical browser build strings.
 */
export function parseDeviceName(userAgent?: string): string {
  if (!userAgent || typeof userAgent !== "string") {
    return "Web Browser";
  }

  let browser = "Web Browser";
  if (/Edg\//i.test(userAgent)) {
    browser = "Microsoft Edge";
  } else if (/OPR\/|Opera/i.test(userAgent)) {
    browser = "Opera";
  } else if (/Brave/i.test(userAgent)) {
    browser = "Brave Browser";
  } else if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) {
    browser = "Google Chrome";
  } else if (/Firefox\//i.test(userAgent)) {
    browser = "Mozilla Firefox";
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    browser = "Apple Safari";
  }

  let os = "";
  if (/iPhone/i.test(userAgent)) {
    os = "iPhone";
  } else if (/iPad/i.test(userAgent)) {
    os = "iPad";
  } else if (/Android/i.test(userAgent)) {
    os = "Android";
  } else if (/Windows NT/i.test(userAgent)) {
    os = "Windows";
  } else if (/Mac OS X|Macintosh/i.test(userAgent)) {
    os = "macOS";
  } else if (/CrOS/i.test(userAgent)) {
    os = "ChromeOS";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
  }

  return os ? `${browser} on ${os}` : browser;
}

async function issueEmailOtp(
  userId: string,
  email: string,
  name: string,
  purpose: "register" | "email-change" = "register",
): Promise<void> {
  const code = generateOtpCode();
  const codeHash = hashOtp(userId, code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await EmailVerification.findOneAndUpdate(
    { user: toObjectId(userId) },
    {
      $set: {
        codeHash,
        attempts: 0,
        lastSentAt: now,
        expiresAt,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  await sendVerificationOtpEmail(email, name, code, purpose);
}

export async function registerUser(input: RegisterInput, req?: Request): Promise<{ message: string }> {
  // Always compute the Argon2id hash first to keep response timing consistent.
  const passwordHash = await hashPassword(input.password);

  const existing = await User.findOne({ email: input.email }).lean<IUser>();
  if (existing) {
    await recordAudit({
      category: "AUTH",
      action: "auth.register_duplicate",
      outcome: "FAILURE",
      actorEmail: input.email,
      req,
    });
    throw AppError.conflict("Unable to complete registration with the provided details");
  }

  let user: IUser;
  try {
    const created = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "USER",
      emailVerified: false,
      status: "PENDING",
    });
    user = created.toJSON() as unknown as IUser;
    user._id = created._id;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: number }).code === 11000) {
      throw AppError.conflict("Unable to complete registration with the provided details");
    }
    throw err;
  }

  await issueEmailOtp(String(user._id), user.email, user.name);

  await recordAudit({
    category: "AUTH",
    action: "auth.register",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return {
    message: "Registration submitted. Please check your email for the 6-digit verification code.",
  };
}

export async function verifyEmailOtp(input: VerifyEmailInput, req?: Request): Promise<{ message: string }> {
  const user = await User.findOne({ email: input.email });
  if (!user || user.emailVerified) {
    await recordAudit({
      category: "AUTH",
      action: "auth.verify_email",
      outcome: "FAILURE",
      actorEmail: input.email,
      req,
    });
    throw new AppError(400, "INVALID_OTP", "Invalid or expired verification code");
  }

  const record = await EmailVerification.findOne({ user: user._id }).select("+codeHash");
  if (!record) {
    await recordAudit({
      category: "AUTH",
      action: "auth.verify_email",
      outcome: "FAILURE",
      actor: user._id,
      actorEmail: user.email,
      req,
      metadata: { reason: "missing_record" },
    });
    throw new AppError(400, "INVALID_OTP", "Invalid or expired verification code");
  }

  const now = Date.now();
  if (record.expiresAt.getTime() <= now) {
    await EmailVerification.deleteOne({ _id: record._id });
    await recordAudit({
      category: "AUTH",
      action: "auth.verify_email",
      outcome: "FAILURE",
      actor: user._id,
      actorEmail: user.email,
      req,
      metadata: { reason: "expired" },
    });
    throw new AppError(400, "OTP_EXPIRED", "Verification code has expired. Please request a new code.");
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await EmailVerification.deleteOne({ _id: record._id });
    await recordAudit({
      category: "SECURITY",
      action: "auth.verify_email_max_attempts",
      outcome: "DENIED",
      actor: user._id,
      actorEmail: user.email,
      req,
    });
    throw new AppError(429, "OTP_MAX_ATTEMPTS", "Maximum verification attempts exceeded. Please request a new code.");
  }

  const expectedHash = hashOtp(String(user._id), input.code);
  const matches = safeEqual(expectedHash, record.codeHash);

  if (!matches) {
    const nextAttempts = record.attempts + 1;
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      await EmailVerification.deleteOne({ _id: record._id });
      await recordAudit({
        category: "SECURITY",
        action: "auth.verify_email_max_attempts",
        outcome: "DENIED",
        actor: user._id,
        actorEmail: user.email,
        req,
      });
      throw new AppError(429, "OTP_MAX_ATTEMPTS", "Maximum verification attempts exceeded. Please request a new code.");
    }

    await EmailVerification.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    await recordAudit({
      category: "AUTH",
      action: "auth.verify_email",
      outcome: "FAILURE",
      actor: user._id,
      actorEmail: user.email,
      req,
      metadata: { attempts: nextAttempts },
    });
    throw new AppError(400, "INVALID_OTP", "Invalid or expired verification code");
  }

  // Single-use: delete the OTP record immediately upon verification.
  await EmailVerification.deleteOne({ _id: record._id });

  user.emailVerified = true;
  if (user.status === "PENDING") {
    user.status = "ACTIVE";
  }
  await user.save();

  void sendWelcomeEmail(user.email, user.name).catch(() => undefined);

  await recordAudit({
    category: "AUTH",
    action: "auth.verify_email",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return { message: "Email verified successfully. You can now sign in." };
}

export async function resendVerificationOtp(
  input: ResendVerificationInput,
  req?: Request,
): Promise<{ message: string }> {
  const genericMessage = "If an unverified account exists for this email, a new verification code has been sent.";
  const user = await User.findOne({ email: input.email }).lean<IUser>();

  // Do not disclose whether an account exists or is already verified.
  if (!user || user.emailVerified || user.status !== "PENDING") {
    await recordAudit({
      category: "AUTH",
      action: "auth.resend_otp_noop",
      outcome: "SUCCESS",
      actorEmail: input.email,
      req,
    });
    return { message: genericMessage };
  }

  const existing = await EmailVerification.findOne({ user: user._id }).lean();
  if (existing && Date.now() - new Date(existing.lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new AppError(429, "OTP_COOLDOWN", "Please wait at least 60 seconds before requesting another verification code.");
  }

  await issueEmailOtp(String(user._id), user.email, user.name);

  await recordAudit({
    category: "AUTH",
    action: "auth.resend_otp",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return { message: genericMessage };
}

async function recordFailedLogin(userId: string, currentFailures: number, email: string, req?: Request, reason = "bad_credentials"): Promise<void> {
  const nextFailures = currentFailures + 1;
  const update: Record<string, unknown> = { failedLoginCount: nextFailures };
  if (nextFailures >= MAX_FAILED_LOGINS) {
    update.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }
  await User.updateOne({ _id: toObjectId(userId) }, { $set: update });

  await recordAudit({
    category: nextFailures >= MAX_FAILED_LOGINS ? "SECURITY" : "AUTH",
    action: nextFailures >= MAX_FAILED_LOGINS ? "auth.account_locked" : "auth.login",
    outcome: "FAILURE",
    actor: toObjectId(userId),
    actorEmail: email,
    req,
    metadata: { failedLoginCount: nextFailures, reason },
  });
}

export interface LoginResult {
  user: Record<string, unknown>;
  session: Record<string, unknown>;
  rawSessionToken: string;
  csrfToken: string;
  mfaEnrollmentRequired: boolean;
}

export async function loginUser(input: LoginInput, req?: Request, existingRawToken?: string): Promise<LoginResult> {
  const user = await User.findOne({ email: input.email }).select(
    "+passwordHash +failedLoginCount +lockedUntil +mfa.secretEncrypted +mfa.recoveryCodeHashes",
  );

  if (!user) {
    await verifyDummyPassword(input.password);
    await recordAudit({
      category: "AUTH",
      action: "auth.login",
      outcome: "FAILURE",
      actorEmail: input.email,
      req,
      metadata: { reason: "unknown_email" },
    });
    throw AppError.unauthorized("Invalid email or password");
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    await verifyDummyPassword(input.password);
    await recordAudit({
      category: "SECURITY",
      action: "auth.login_while_locked",
      outcome: "DENIED",
      actor: user._id,
      actorEmail: user.email,
      req,
    });
    throw new AppError(
      429,
      "ACCOUNT_LOCKED",
      "Account is temporarily locked due to multiple failed sign-in attempts. Please try again later.",
    );
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    await recordFailedLogin(String(user._id), user.failedLoginCount ?? 0, user.email, req, "invalid_password");
    throw AppError.unauthorized("Invalid email or password");
  }

  if (!user.emailVerified || user.status === "PENDING") {
    await recordAudit({
      category: "AUTH",
      action: "auth.login_unverified",
      outcome: "DENIED",
      actor: user._id,
      actorEmail: user.email,
      req,
    });
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email address before signing in");
  }

  if (user.status === "SUSPENDED") {
    const suspCheck = await evaluateUserSuspension(user.toObject(), req);
    if (suspCheck.suspended) {
      await recordAudit({
        category: "SECURITY",
        action: "auth.login_suspended",
        outcome: "DENIED",
        actor: user._id,
        actorEmail: user.email,
        req,
        metadata: {
          suspensionType: user.suspension?.type ?? "PERMANENT",
          expiresAt: user.suspension?.expiresAt ? new Date(user.suspension.expiresAt).toISOString() : "PERMANENT",
        },
      });
      throw new AppError(403, "ACCOUNT_SUSPENDED", suspCheck.message ?? "Your account has been suspended");
    }
    user.status = suspCheck.user.status;
    user.suspension = undefined;
  }

  const mfaVerified = true;

  // Reset lockout counters and record login timestamp
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = now;
  await user.save();

  // Session regeneration: if the client held a previous session cookie, revoke it
  if (existingRawToken) {
    const oldHash = hashToken(existingRawToken, "session");
    await Session.updateOne({ tokenHash: oldHash }, { $set: { revokedAt: now } });
  }

  const rawSessionToken = generateToken(32);
  const tokenHash = hashToken(rawSessionToken, "session");
  const csrfToken = deriveCsrfToken(rawSessionToken);
  const csrfTokenHash = hashToken(csrfToken, "csrf");

  const sessionDoc = await Session.create({
    user: user._id,
    tokenHash,
    csrfTokenHash,
    mfaVerified,
    ip: req?.ip?.slice(0, 64),
    userAgent: req?.get("user-agent")?.slice(0, 300),
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });

  await recordAudit({
    category: "AUTH",
    action: "auth.login",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
    metadata: { role: user.role, mfaVerified },
  });

  return {
    user: user.toJSON() as unknown as Record<string, unknown>,
    session: sessionDoc.toJSON() as unknown as Record<string, unknown>,
    rawSessionToken,
    csrfToken,
    mfaEnrollmentRequired: false,
  };
}

export async function logoutSession(rawToken: string | undefined, req?: Request): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken, "session");
  const session = await Session.findOneAndUpdate(
    { tokenHash, revokedAt: trusted({ $exists: false }) },
    { $set: { revokedAt: new Date() } },
  );

  if (session) {
    await recordAudit({
      category: "AUTH",
      action: "auth.logout",
      outcome: "SUCCESS",
      actor: session.user,
      req,
    });
  }
}

export async function logoutAllSessions(userId: string, req?: Request): Promise<{ revokedCount: number }> {
  const now = new Date();
  const res = await Session.updateMany(
    { user: toObjectId(userId), revokedAt: trusted({ $exists: false }) },
    { $set: { revokedAt: now } },
  );

  await recordAudit({
    category: "AUTH",
    action: "auth.logout_all",
    outcome: "SUCCESS",
    actor: toObjectId(userId),
    req,
    metadata: { revokedCount: res.modifiedCount },
  });

  return { revokedCount: res.modifiedCount };
}

export async function listUserSessions(userId: string, currentSessionId?: string): Promise<Record<string, unknown>[]> {
  const now = new Date();
  const sessions = await Session.find({
    user: toObjectId(userId),
    revokedAt: trusted({ $exists: false }),
    expiresAt: trusted({ $gt: now }),
  }).sort({ lastSeenAt: -1 });

  return sessions.map((s) => ({
    ...(s.toJSON() as unknown as Record<string, unknown>),
    current: currentSessionId ? String(s._id) === String(currentSessionId) : false,
  }));
}

export async function revokeUserSession(userId: string, sessionId: string, req?: Request): Promise<void> {
  const now = new Date();
  const session = await Session.findOneAndUpdate(
    {
      _id: toObjectId(sessionId),
      user: toObjectId(userId),
      revokedAt: trusted({ $exists: false }),
    },
    { $set: { revokedAt: now } },
  );

  if (!session) {
    throw AppError.notFound("Session not found");
  }

  await recordAudit({
    category: "AUTH",
    action: "auth.revoke_session",
    outcome: "SUCCESS",
    actor: toObjectId(userId),
    targetType: "Session",
    targetId: sessionId,
    req,
  });
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  req?: Request,
): Promise<{ message: string }> {
  const genericMessage = "If an account with that email address exists, a password reset link has been sent.";
  const user = await User.findOne({ email: input.email }).lean<IUser>();

  if (!user || !user.emailVerified || user.status !== "ACTIVE") {
    await recordAudit({
      category: "AUTH",
      action: "auth.forgot_password_noop",
      outcome: "SUCCESS",
      actorEmail: input.email,
      req,
    });
    return { message: genericMessage };
  }

  // Invalidate any previous unused reset tokens for this user
  await PasswordResetToken.deleteMany({ user: user._id });

  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken, "password-reset");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await PasswordResetToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    requestedIp: req?.ip?.slice(0, 64),
  });

  await sendPasswordResetEmail(user.email, user.name, rawToken);

  await recordAudit({
    category: "AUTH",
    action: "auth.forgot_password",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return { message: genericMessage };
}

export async function resetPassword(input: ResetPasswordInput, req?: Request): Promise<{ message: string }> {
  const tokenHash = hashToken(input.token, "password-reset");
  const now = new Date();

  // Atomically claim the single-use token so concurrent requests cannot reuse it
  const tokenRecord = await PasswordResetToken.findOneAndUpdate(
    {
      tokenHash,
      usedAt: trusted({ $exists: false }),
      expiresAt: trusted({ $gt: now }),
    },
    { $set: { usedAt: now } },
    { returnDocument: "before" },
  );

  if (!tokenRecord) {
    await recordAudit({
      category: "SECURITY",
      action: "auth.reset_password_invalid_token",
      outcome: "FAILURE",
      req,
    });
    throw new AppError(400, "INVALID_RESET_TOKEN", "Invalid or expired password reset token");
  }

  const user = await User.findById(tokenRecord.user);
  if (!user || user.status === "SUSPENDED") {
    throw new AppError(400, "INVALID_RESET_TOKEN", "Invalid or expired password reset token");
  }

  user.passwordHash = await hashPassword(input.password);
  user.passwordChangedAt = now;
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  await user.save();

  // Invalidate ALL existing sessions for this user after password reset
  await Session.updateMany(
    { user: user._id, revokedAt: trusted({ $exists: false }) },
    { $set: { revokedAt: now } },
  );

  await recordAudit({
    category: "AUTH",
    action: "auth.reset_password",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return { message: "Password has been reset successfully. Please sign in with your new password." };
}

export async function changePassword(
  userId: string,
  currentSessionId: string,
  input: ChangePasswordInput,
  req?: Request,
): Promise<{ message: string }> {
  const user = await User.findById(toObjectId(userId)).select("+passwordHash");
  if (!user) throw AppError.unauthorized();

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    await recordAudit({
      category: "AUTH",
      action: "auth.change_password",
      outcome: "FAILURE",
      actor: user._id,
      actorEmail: user.email,
      req,
    });
    throw new AppError(400, "INVALID_PASSWORD", "Current password is incorrect");
  }

  const now = new Date();
  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordChangedAt = now;
  await user.save();

  // Revoke all other sessions except the current one
  await Session.updateMany(
    {
      user: user._id,
      _id: trusted({ $ne: toObjectId(currentSessionId) }),
      revokedAt: trusted({ $exists: false }),
    },
    { $set: { revokedAt: now } },
  );

  await recordAudit({
    category: "AUTH",
    action: "auth.change_password",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  if (user.preferences?.securityAlerts !== false) {
    void sendSecurityNotificationEmail(
      user.email,
      user.name,
      "Password Changed",
      "Your account password was changed from your Account Security settings.",
    ).catch(() => undefined);
  }

  return { message: "Password updated successfully." };
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
  req?: Request,
): Promise<Record<string, unknown>> {
  const existing = await User.findById(toObjectId(userId));
  if (!existing) throw AppError.notFound("User not found");

  if (input.name !== undefined) {
    existing.name = sanitizePlainText(input.name);
  }
  if (input.bio !== undefined) {
    existing.bio = sanitizePlainText(input.bio);
  }
  if (input.location !== undefined) {
    existing.location = sanitizePlainText(input.location);
  }
  if (input.preferences !== undefined) {
    const currentPrefs = existing.preferences ?? { securityAlerts: true, emailNotifications: true };
    existing.preferences = {
      securityAlerts: input.preferences.securityAlerts ?? currentPrefs.securityAlerts,
      emailNotifications: input.preferences.emailNotifications ?? currentPrefs.emailNotifications,
    };
  }

  await existing.save();

  await recordAudit({
    category: "AUTH",
    action: "auth.update_profile",
    outcome: "SUCCESS",
    actor: existing._id,
    actorEmail: existing.email,
    req,
  });

  return existing.toJSON() as unknown as Record<string, unknown>;
}

export async function uploadUserAvatar(
  userId: string,
  input: UploadAvatarInput,
  req?: Request,
): Promise<Record<string, unknown>> {
  const user = await User.findById(toObjectId(userId));
  if (!user) throw AppError.notFound("User not found");

  let rawBase64 = input.fileBase64.trim();
  let declaredMime = input.mimeType;

  const dataUriMatch = /^data:([^;]+);base64,([\s\S]+)$/i.exec(rawBase64);
  if (dataUriMatch) {
    declaredMime = (declaredMime ?? dataUriMatch[1]) as UploadAvatarInput["mimeType"];
    rawBase64 = dataUriMatch[2]!;
  }

  const buffer = Buffer.from(rawBase64, "base64");
  const verified = verifyUploadedImage(buffer, declaredMime);
  const folder = "dezaakir/profile";
  const signed = createSignedCloudinaryParams(folder);
  const fullPublicId = `${folder}/${signed.publicId}`;

  let avatarUrl: string | undefined;

  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET && !isTest) {
    try {
      const form = new FormData();
      form.append("file", `data:${verified.mimeType};base64,${buffer.toString("base64")}`);
      form.append("api_key", signed.apiKey);
      form.append("timestamp", String(signed.timestamp));
      form.append("folder", signed.folder);
      form.append("public_id", signed.publicId);
      form.append("signature", signed.signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`,
        { method: "POST", body: form },
      );

      if (uploadRes.ok) {
        const cloudData = (await uploadRes.json()) as { secure_url?: string };
        if (cloudData.secure_url) {
          avatarUrl = cloudData.secure_url;
        }
      }
    } catch {
      // Fallback to inline verified data URI below if Cloudinary network is unreachable
    }
  }

  if (!avatarUrl) {
    if (isTest) {
      const cloud = signed.cloudName || "dezaakir-test";
      avatarUrl = `https://res.cloudinary.com/${cloud}/image/upload/${fullPublicId}.${verified.format}`;
    } else {
      if (buffer.length > 2_500_000) {
        throw AppError.badRequest("Profile avatar image must be 2.5 MB or smaller");
      }
      avatarUrl = `data:${verified.mimeType};base64,${buffer.toString("base64")}`;
    }
  }

  user.avatar = {
    url: avatarUrl,
    publicId: fullPublicId,
    alt: input.alt ? sanitizePlainText(input.alt) : `${user.name} profile picture`,
  };
  await user.save();

  await recordAudit({
    category: "AUTH",
    action: "auth.update_avatar",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
    metadata: { format: verified.format, bytes: verified.bytes },
  });

  return user.toJSON() as unknown as Record<string, unknown>;
}

export async function removeUserAvatar(userId: string, req?: Request): Promise<Record<string, unknown>> {
  const user = await User.findById(toObjectId(userId));
  if (!user) throw AppError.notFound("User not found");

  user.avatar = undefined;
  await user.save();

  await recordAudit({
    category: "AUTH",
    action: "auth.remove_avatar",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return user.toJSON() as unknown as Record<string, unknown>;
}

export async function requestEmailChange(
  userId: string,
  input: RequestEmailChangeInput,
  req?: Request,
): Promise<{ message: string; pendingEmail: string }> {
  const user = await User.findById(toObjectId(userId)).select("+passwordHash");
  if (!user) throw AppError.unauthorized();

  const passwordValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!passwordValid) {
    await recordAudit({
      category: "SECURITY",
      action: "auth.email_change_request_bad_password",
      outcome: "FAILURE",
      actor: user._id,
      actorEmail: user.email,
      req,
    });
    throw new AppError(400, "INVALID_PASSWORD", "Current password is incorrect");
  }

  const normalizedNewEmail = input.newEmail.trim().toLowerCase();
  if (normalizedNewEmail === user.email) {
    throw AppError.badRequest("New email address must be different from your current email address");
  }

  const emailTaken = await User.exists({
    email: normalizedNewEmail,
    _id: trusted({ $ne: user._id }),
  });
  if (emailTaken) {
    throw AppError.conflict("That email address is already associated with another account");
  }

  user.pendingEmail = normalizedNewEmail;
  await user.save();

  await issueEmailOtp(String(user._id), normalizedNewEmail, user.name, "email-change");

  await recordAudit({
    category: "AUTH",
    action: "auth.email_change_requested",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
    metadata: { pendingEmail: normalizedNewEmail },
  });

  return {
    message: `A 6-digit verification code has been sent to ${normalizedNewEmail}.`,
    pendingEmail: normalizedNewEmail,
  };
}

export async function verifyEmailChange(
  userId: string,
  input: VerifyEmailChangeInput,
  req?: Request,
): Promise<{ message: string; user: Record<string, unknown> }> {
  const user = await User.findById(toObjectId(userId));
  if (!user) throw AppError.unauthorized();
  if (!user.pendingEmail) {
    throw AppError.badRequest("No pending email address change was found");
  }

  const record = await EmailVerification.findOne({ user: user._id }).select("+codeHash");
  if (!record || record.expiresAt.getTime() <= Date.now()) {
    if (record) await EmailVerification.deleteOne({ _id: record._id });
    throw new AppError(400, "OTP_EXPIRED", "Verification code is invalid or has expired");
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await EmailVerification.deleteOne({ _id: record._id });
    throw new AppError(429, "OTP_MAX_ATTEMPTS", "Maximum verification attempts exceeded. Please request a new code.");
  }

  const expectedHash = hashOtp(String(user._id), input.code);
  if (!safeEqual(expectedHash, record.codeHash)) {
    await EmailVerification.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    throw new AppError(400, "INVALID_OTP", "Invalid verification code");
  }

  await EmailVerification.deleteOne({ _id: record._id });

  const oldEmail = user.email;
  const newEmail = user.pendingEmail;

  const emailTaken = await User.exists({
    email: newEmail,
    _id: trusted({ $ne: user._id }),
  });
  if (emailTaken) {
    user.pendingEmail = undefined;
    await user.save();
    throw AppError.conflict("That email address is already in use");
  }

  user.email = newEmail;
  user.pendingEmail = undefined;
  user.emailVerified = true;
  await user.save();

  await recordAudit({
    category: "AUTH",
    action: "auth.email_changed",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: newEmail,
    req,
    metadata: { previousEmail: oldEmail, newEmail },
  });

  if (user.preferences?.securityAlerts !== false) {
    void sendSecurityNotificationEmail(
      oldEmail,
      user.name,
      "Email Address Updated",
      `Your account email address was updated from ${oldEmail} to ${newEmail}.`,
    ).catch(() => undefined);
  }

  return {
    message: "Your email address has been verified and updated.",
    user: user.toJSON() as unknown as Record<string, unknown>,
  };
}

export interface CleanLoginActivityItem {
  id: string;
  timestamp: Date;
  deviceName: string;
  current: boolean;
}

/**
 * Returns recent login activity with ONLY date/time and a clean human-readable device name.
 * Never exposes raw browser User-Agent strings or raw session tokens.
 */
export async function getRecentLoginActivity(
  userId: string,
  currentSessionId?: string,
): Promise<CleanLoginActivityItem[]> {
  const userObjId = toObjectId(userId);
  const [recentSessions, recentLoginAudits] = await Promise.all([
    Session.find({ user: userObjId }).sort({ createdAt: -1 }).limit(8).lean<ISession[]>(),
    AuditLog.find({ actor: userObjId, action: "auth.login", outcome: "SUCCESS" })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean<IAuditLog[]>(),
  ]);

  if (recentSessions.length > 0) {
    return recentSessions.map((s) => ({
      id: String(s._id),
      timestamp: s.createdAt,
      deviceName: parseDeviceName(s.userAgent),
      current: Boolean(currentSessionId && String(s._id) === String(currentSessionId) && !s.revokedAt),
    }));
  }

  return recentLoginAudits.map((log, index) => ({
    id: String(log._id),
    timestamp: log.createdAt,
    deviceName: parseDeviceName(log.userAgent),
    current: index === 0,
  }));
}

// ── TOTP Administrator MFA enrollment & verification ────────────────────────

export async function initiateMfaSetup(
  userId: string,
  req?: Request,
): Promise<{ secret: string; otpauthUri: string }> {
  const user = await User.findById(toObjectId(userId)).select("+mfa.secretEncrypted");
  if (!user) throw AppError.unauthorized();

  if (user.mfa?.enabled) {
    throw AppError.conflict("Multi-factor authentication is already enabled on this account");
  }

  const secret = generateTotpSecret();
  const secretEncrypted = encryptSecret(secret);
  const otpauthUri = buildOtpAuthUri(user.email, secret);

  user.mfa = {
    enabled: false,
    secretEncrypted,
    recoveryCodeHashes: [],
  };
  await user.save();

  await recordAudit({
    category: "AUTH",
    action: "auth.mfa_setup_initiated",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return { secret, otpauthUri };
}

export async function enableMfa(
  userId: string,
  sessionId: string,
  totpCode: string,
  req?: Request,
): Promise<{ recoveryCodes: string[] }> {
  const user = await User.findById(toObjectId(userId)).select("+mfa.secretEncrypted +mfa.recoveryCodeHashes");
  if (!user) throw AppError.unauthorized();
  if (user.mfa?.enabled) {
    throw AppError.conflict("Multi-factor authentication is already enabled");
  }
  if (!user.mfa?.secretEncrypted) {
    throw AppError.badRequest("Please initiate MFA setup before verifying a code");
  }

  const secret = decryptSecret(user.mfa.secretEncrypted);
  if (!verifyTotpCode(secret, totpCode)) {
    await recordAudit({
      category: "AUTH",
      action: "auth.mfa_enable_failed",
      outcome: "FAILURE",
      actor: user._id,
      actorEmail: user.email,
      req,
    });
    throw new AppError(400, "INVALID_TOTP", "Invalid authenticator code");
  }

  const { plain, hashes } = generateRecoveryCodes(8);
  const now = new Date();
  user.mfa.enabled = true;
  user.mfa.enabledAt = now;
  user.mfa.recoveryCodeHashes = hashes;
  await user.save();

  await Session.updateOne({ _id: toObjectId(sessionId) }, { $set: { mfaVerified: true } });

  await recordAudit({
    category: "AUTH",
    action: "auth.mfa_enabled",
    outcome: "SUCCESS",
    actor: user._id,
    actorEmail: user.email,
    req,
  });

  return { recoveryCodes: plain };
}
