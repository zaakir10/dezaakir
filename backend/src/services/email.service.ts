import { resolveTxt } from "node:dns/promises";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isProduction, isTest } from "../config/env.js";
import { EmailSuppression } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

/**
 * Captured email record used ONLY inside automated test runs (`NODE_ENV === "test"`).
 * Never populated in development or production.
 */
export interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  meta?: { type: "otp" | "password-reset" | "welcome" | "security" | "campaign"; codeOrToken?: string };
}

const capturedEmails: CapturedEmail[] = [];
const capturedCampaignEmails: CapturedEmail[] = [];

export function getCapturedEmails(): readonly CapturedEmail[] {
  if (!isTest) return [];
  return capturedEmails;
}

export function getCapturedCampaignEmails(): readonly CapturedEmail[] {
  if (!isTest) return [];
  return capturedCampaignEmails;
}

export function clearCapturedEmails(): void {
  capturedEmails.length = 0;
  capturedCampaignEmails.length = 0;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // false for STARTTLS on 587
    requireTLS: true,
    auth: env.SMTP_USER && env.SMTP_APP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_APP_PASSWORD } : undefined,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    },
  });

  return transporter;
}

/** Verifies Gmail SMTP connectivity on demand without logging credentials. */
export async function verifySmtpConnection(): Promise<boolean> {
  if (isTest) return true;
  if (!env.SMTP_USER || !env.SMTP_APP_PASSWORD) {
    logger.warn("SMTP credentials are not configured yet; skipping SMTP verification");
    return false;
  }
  try {
    await getTransporter().verify();
    logger.info({ host: env.SMTP_HOST, port: env.SMTP_PORT }, "Gmail SMTP transport verified");
    return true;
  } catch (err) {
    logger.error({ errName: err instanceof Error ? err.name : "SmtpError" }, "Gmail SMTP verification failed");
    return false;
  }
}

/** Escapes HTML special characters for safe interpolation inside email templates. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Converts sanitized HTML into a clean plain-text fallback for email clients. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface EmailLayoutOptions {
  categoryLabel?: string;
  footerNotice?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/**
 * Brand-compliant responsive HTML email layout using ONLY Navy Blue (#0B1628) and White (#FFFFFF).
 * Designed for compatibility across Gmail, Outlook, Apple Mail, and mobile devices.
 */
export function renderEmailLayout(title: string, bodyHtml: string, options: EmailLayoutOptions = {}): string {
  const baseUrl = env.FRONTEND_URL.replace(/\/$/, "");
  const logoUrl = `${baseUrl}/logo.png`;
  const categoryLabel = options.categoryLabel ?? "SECURITY & ACCOUNT NOTICE";
  const footerNotice =
    options.footerNotice ??
    "This is an official communication from Dezaakir. If you did not expect this message or require assistance, please contact our security and engineering team.";
  const year = new Date().getUTCFullYear();

  const ctaBlock =
    options.ctaLabel && options.ctaUrl
      ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 8px 0;">
          <tr>
            <td align="left">
              <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;padding:14px 28px;background-color:#FFFFFF;color:#0B1628;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.6px;text-transform:uppercase;border-radius:6px;border:1px solid #FFFFFF;">
                ${escapeHtml(options.ctaLabel)}
              </a>
            </td>
          </tr>
        </table>
      `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1628;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B1628;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#0B1628;border:1px solid rgba(255,255,255,0.22);border-radius:12px;overflow:hidden;">
          <!-- Header with Original Dezaakir Logo -->
          <tr>
            <td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.14);background-color:#0B1628;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${escapeHtml(baseUrl)}" style="text-decoration:none;color:#FFFFFF;display:inline-block;">
                      <img src="${escapeHtml(logoUrl)}" alt="Dezaakir" width="136" style="display:block;border:0;outline:none;text-decoration:none;max-width:136px;height:auto;" />
                    </a>
                  </td>
                  <td align="right" valign="middle" style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;opacity:0.7;font-weight:600;">
                    ${escapeHtml(categoryLabel)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:36px 36px 28px 36px;background-color:#0B1628;color:#FFFFFF;">
              <h1 style="margin:0 0 20px 0;font-size:24px;line-height:1.3;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">
                ${escapeHtml(title)}
              </h1>
              <div style="font-size:15px;line-height:1.7;color:#FFFFFF;">
                ${bodyHtml}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 32px 36px;border-top:1px solid rgba(255,255,255,0.14);background-color:#0B1628;">
              <p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:#FFFFFF;opacity:0.72;">
                ${escapeHtml(footerNotice)}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size:11px;color:#FFFFFF;opacity:0.55;">
                    &copy; ${year} Dezaakir. All rights reserved.
                  </td>
                  <td align="right" style="font-size:11px;color:#FFFFFF;opacity:0.75;">
                    <a href="${escapeHtml(baseUrl)}" style="color:#FFFFFF;text-decoration:underline;">dezaakir.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function classifyEmailError(err: unknown): {
  category: "AUTH_ERROR" | "RECIPIENT_REJECTED" | "TRANSIENT_SMTP" | "SUPPRESSED" | "CONFIG_ERROR" | "UNKNOWN";
  isHardBounce: boolean;
  isTransient: boolean;
  safeMessage: string;
} {
  if (err instanceof AppError && err.code === "EMAIL_SUPPRESSED") {
    return {
      category: "SUPPRESSED",
      isHardBounce: false,
      isTransient: false,
      safeMessage: err.message,
    };
  }
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const code = (err as { responseCode?: number; code?: string })?.responseCode;
  const sysCode = (err as { code?: string })?.code ?? "";

  if (code === 535 || /auth|invalid login|username and password/i.test(msg)) {
    return {
      category: "AUTH_ERROR",
      isHardBounce: false,
      isTransient: false,
      safeMessage: "SMTP authentication failed",
    };
  }
  if (code === 550 || code === 551 || code === 553 || /5\.1\.1|user unknown|no such user|mailbox unavailable|recipient rejected/i.test(msg)) {
    return {
      category: "RECIPIENT_REJECTED",
      isHardBounce: true,
      isTransient: false,
      safeMessage: "Recipient address rejected or undeliverable",
    };
  }
  if (
    (code && code >= 400 && code < 500) ||
    /ETIMEDOUT|ECONNRESET|ECONNREFUSED|ESOCKET|rate|try again|temporarily/i.test(`${sysCode} ${msg}`)
  ) {
    return {
      category: "TRANSIENT_SMTP",
      isHardBounce: false,
      isTransient: true,
      safeMessage: "Temporary SMTP delivery failure",
    };
  }
  return {
    category: "UNKNOWN",
    isHardBounce: false,
    isTransient: false,
    safeMessage: "Email delivery failed",
  };
}

function extractSenderEmailAddress(): string {
  const raw = env.EMAIL_FROM || env.SMTP_USER || "";
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

function extractDomain(emailOrUrl: string): string {
  if (!emailOrUrl) return "";
  if (emailOrUrl.includes("@")) {
    return emailOrUrl.split("@")[1]?.trim().toLowerCase() ?? "";
  }
  try {
    return new URL(emailOrUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const recentEmailDedupe = new Map<string, number>();

async function isAddressSuppressed(email: string): Promise<boolean> {
  try {
    const doc = await EmailSuppression.findOne({ email: email.toLowerCase(), suppressed: true }).lean();
    return Boolean(doc);
  } catch {
    return false;
  }
}

async function recordDeliveryFailure(email: string, category: string, reason: string, hardBounce: boolean): Promise<void> {
  try {
    const normalized = email.toLowerCase().trim();
    const existing = await EmailSuppression.findOne({ email: normalized });
    if (!existing) {
      const shouldSuppress = hardBounce;
      await EmailSuppression.create({
        email: normalized,
        failureCount: 1,
        suppressed: shouldSuppress,
        reason: reason.slice(0, 300),
        lastErrorCategory: category,
        lastFailedAt: new Date(),
        ...(shouldSuppress ? { suppressedAt: new Date() } : {}),
      });
      return;
    }
    const nextCount = existing.failureCount + 1;
    const shouldSuppress = existing.suppressed || hardBounce || nextCount >= 3;
    existing.failureCount = nextCount;
    existing.suppressed = shouldSuppress;
    existing.reason = reason.slice(0, 300);
    existing.lastErrorCategory = category;
    existing.lastFailedAt = new Date();
    if (shouldSuppress && !existing.suppressedAt) {
      existing.suppressedAt = new Date();
    }
    await existing.save();
  } catch {
    // Do not crash email flow if suppression tracking fails
  }
}

async function clearAddressFailure(email: string): Promise<void> {
  try {
    await EmailSuppression.deleteOne({ email: email.toLowerCase().trim() });
  } catch {
    // Non-blocking
  }
}

async function deliverEmail(
  payload: CapturedEmail,
  captureBucket: "auth" | "campaign" = "auth",
  options?: { isMarketing?: boolean },
): Promise<void> {
  // Reject header injection characters in recipient or subject
  if (/[\r\n]/.test(payload.to) || /[\r\n]/.test(payload.subject)) {
    throw AppError.badRequest("Invalid email header");
  }

  const recipient = payload.to.trim().toLowerCase();

  // Check bounce suppression list before attempting delivery
  if (await isAddressSuppressed(recipient)) {
    throw new AppError(400, "EMAIL_SUPPRESSED", "This email address has been suppressed due to repeated delivery bounces");
  }

  // Duplicate prevention within a 15-second window for identical non-test sends
  if (!isTest) {
    const dedupeKey = `${recipient}|${payload.subject}|${captureBucket}`;
    const lastSent = recentEmailDedupe.get(dedupeKey);
    const now = Date.now();
    if (lastSent && now - lastSent < 15_000) {
      logger.warn({ subject: payload.subject }, "Skipped duplicate email within 15s deduplication window");
      return;
    }
    recentEmailDedupe.set(dedupeKey, now);
    if (recentEmailDedupe.size > 500) {
      const oldestKey = recentEmailDedupe.keys().next().value;
      if (oldestKey) recentEmailDedupe.delete(oldestKey);
    }
  }

  if (isTest) {
    if (captureBucket === "auth") {
      capturedEmails.push(payload);
    } else {
      capturedCampaignEmails.push(payload);
    }
    return;
  }

  if (!env.SMTP_USER || !env.SMTP_APP_PASSWORD) {
    if (isProduction) {
      logger.error("SMTP credentials missing in production");
      throw new AppError(503, "EMAIL_UNAVAILABLE", "Email delivery is temporarily unavailable");
    }
    logger.warn({ to: payload.to, subject: payload.subject }, "SMTP not configured in development; email delivery skipped");
    return;
  }

  const fromAddress = env.EMAIL_FROM || env.SMTP_USER;
  const replyToAddress = extractSenderEmailAddress() || env.SMTP_USER;
  const siteBase = env.FRONTEND_URL.replace(/\/+$/, "");

  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await getTransporter().sendMail({
        from: fromAddress,
        replyTo: replyToAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        ...(options?.isMarketing
          ? {
              headers: {
                "List-Unsubscribe": `<${siteBase}/account>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      });
      await clearAddressFailure(recipient);
      logger.info({ subject: payload.subject, attempt }, "Transactional email accepted by SMTP server");
      return;
    } catch (err) {
      lastError = err;
      const classified = classifyEmailError(err);
      if (classified.isTransient && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 350));
        continue;
      }
      await recordDeliveryFailure(recipient, classified.category, classified.safeMessage, classified.isHardBounce);
      logger.error(
        {
          errName: err instanceof Error ? err.name : "SmtpError",
          category: classified.category,
          attempt,
        },
        "Failed to send email via SMTP",
      );
      throw new AppError(503, "EMAIL_DELIVERY_FAILED", "Unable to send email at this time. Please try again later.");
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new AppError(503, "EMAIL_DELIVERY_FAILED", "Unable to send email at this time.");
}

export async function sendVerificationOtpEmail(
  to: string,
  name: string,
  otpCode: string,
  purpose: "register" | "email-change" = "register",
): Promise<void> {
  const isEmailChange = purpose === "email-change";
  const subject = isEmailChange ? "Confirm your new Dezaakir email address" : "Verify your Dezaakir account";
  const heading = isEmailChange ? "Confirm your new email address" : "Verify your email address";
  const introText = isEmailChange
    ? `Hello ${name}, please enter the 6-digit verification code below to confirm updating your Dezaakir account email address:`
    : `Hello ${name}, welcome to Dezaakir. Use the 6-digit verification code below to verify your email address and activate your account:`;

  const text = [
    `Hello ${name},`,
    "",
    isEmailChange
      ? `Your Dezaakir email update verification code is: ${otpCode}`
      : `Your Dezaakir email verification code is: ${otpCode}`,
    "",
    "This six-digit code expires in 10 minutes and can only be used once.",
    "Never share this code with anyone.",
  ].join("\n");

  const html = renderEmailLayout(
    heading,
    `
      <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#FFFFFF;">
        ${escapeHtml(introText)}
      </p>
      <div style="margin:24px 0;padding:22px 24px;background-color:#FFFFFF;color:#0B1628;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:30px;font-weight:800;letter-spacing:10px;text-align:center;border-radius:8px;">
        ${escapeHtml(otpCode)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0 0;border:1px solid rgba(255,255,255,0.18);border-radius:8px;">
        <tr>
          <td style="padding:14px 18px;font-size:13px;line-height:1.5;color:#FFFFFF;">
            <strong>Security Notice:</strong> This verification code expires in <strong>10 minutes</strong> and is valid for a single use. Dezaakir staff will never ask you for this code.
          </td>
        </tr>
      </table>
    `,
    { categoryLabel: "IDENTITY VERIFICATION" },
  );

  await deliverEmail(
    {
      to,
      subject,
      text,
      html,
      meta: isTest ? { type: "otp", codeOrToken: otpCode } : undefined,
    },
    "auth",
  );
}

export async function sendPasswordResetEmail(to: string, name: string, rawToken: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = "Reset your Dezaakir password";
  const text = [
    `Hello ${name},`,
    "",
    "A password reset was requested for your Dezaakir account.",
    "Reset your password using this single-use link (valid for 30 minutes):",
    resetUrl,
    "",
    "If you did not request a password reset, no action is needed and your password will remain unchanged.",
  ].join("\n");

  const html = renderEmailLayout(
    "Reset your password",
    `
      <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#FFFFFF;">
        Hello ${escapeHtml(name)}, we received a request to reset the password associated with your Dezaakir account.
      </p>
      <div style="margin:28px 0;text-align:center;">
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:15px 32px;background-color:#FFFFFF;color:#0B1628;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.4px;border-radius:8px;">
          Reset Password
        </a>
      </div>
      <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#FFFFFF;">
        This single-use link expires in <strong>30 minutes</strong>. For your security, all active sessions will be signed out once your password is changed.
      </p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#FFFFFF;opacity:0.75;word-break:break-all;">
        Direct link: <a href="${escapeHtml(resetUrl)}" style="color:#FFFFFF;text-decoration:underline;">${escapeHtml(resetUrl)}</a>
      </p>
    `,
    { categoryLabel: "PASSWORD RECOVERY" },
  );

  await deliverEmail(
    {
      to,
      subject,
      text,
      html,
      meta: isTest ? { type: "password-reset", codeOrToken: rawToken } : undefined,
    },
    "auth",
  );
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const accountUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/account`;
  const subject = "Welcome to Dezaakir — Your account is verified";
  const text = [
    `Hello ${name},`,
    "",
    "Welcome to Dezaakir! Your email address has been verified and your account is now active.",
    `Access your profile and security settings here: ${accountUrl}`,
  ].join("\n");

  const html = renderEmailLayout(
    "Welcome to Dezaakir",
    `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#FFFFFF;">
        Hello ${escapeHtml(name)}, thank you for verifying your email address. Your Dezaakir account is now active and ready to use.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.65;color:#FFFFFF;opacity:0.9;">
        From your account profile, you can customize your personal information, upload a profile picture, and manage your security preferences.
      </p>
    `,
    {
      categoryLabel: "WELCOME",
      ctaLabel: "Open Your Profile",
      ctaUrl: accountUrl,
    },
  );

  await deliverEmail(
    {
      to,
      subject,
      text,
      html,
      meta: isTest ? { type: "welcome" } : undefined,
    },
    "campaign",
  );
}

export async function sendSecurityNotificationEmail(
  to: string,
  name: string,
  eventTitle: string,
  eventDescription: string,
): Promise<void> {
  const accountUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/account`;
  const timestamp = new Date().toUTCString();
  const subject = `Dezaakir Security Alert: ${eventTitle}`;
  const text = [
    `Hello ${name},`,
    "",
    `Security Notification: ${eventTitle}`,
    eventDescription,
    `Timestamp: ${timestamp}`,
    "",
    `Review your account security settings: ${accountUrl}`,
  ].join("\n");

  const html = renderEmailLayout(
    eventTitle,
    `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#FFFFFF;">
        Hello ${escapeHtml(name)}, an important security change was completed on your Dezaakir account:
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid rgba(255,255,255,0.22);border-radius:8px;">
        <tr>
          <td style="padding:18px 20px;font-size:14px;line-height:1.6;color:#FFFFFF;">
            <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(eventTitle)}</div>
            <div style="opacity:0.9;margin-bottom:8px;">${escapeHtml(eventDescription)}</div>
            <div style="font-size:12px;opacity:0.7;">Time: ${escapeHtml(timestamp)}</div>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#FFFFFF;opacity:0.85;">
        If you made this change, no further action is needed. If you do not recognize this activity, please reset your password immediately.
      </p>
    `,
    {
      categoryLabel: "SECURITY NOTIFICATION",
      ctaLabel: "Review Account Security",
      ctaUrl: accountUrl,
    },
  );

  await deliverEmail(
    {
      to,
      subject,
      text,
      html,
      meta: isTest ? { type: "security" } : undefined,
    },
    "campaign",
  );
}

export async function sendRoleChangeNotificationEmail(
  to: string,
  name: string,
  previousRole: string,
  newRole: string,
): Promise<void> {
  await sendSecurityNotificationEmail(
    to,
    name,
    "Account Role Updated",
    `Your Dezaakir account role was updated from ${previousRole} to ${newRole} by an authorized administrator.`,
  );
}

/**
 * Renders a custom Admin Dashboard email inside the official Dezaakir brand layout.
 */
export function renderCustomAdminEmail(
  subject: string,
  sanitizedBodyHtml: string,
  recipientName?: string,
): { html: string; text: string } {
  const greetingHtml = recipientName
    ? `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#FFFFFF;">Hello ${escapeHtml(recipientName)},</p>`
    : "";

  const combinedBody = `${greetingHtml}<div style="font-size:15px;line-height:1.7;color:#FFFFFF;">${sanitizedBodyHtml}</div>`;
  const html = renderEmailLayout(subject, combinedBody, {
    categoryLabel: "OFFICIAL COMMUNICATION",
    footerNotice:
      "You are receiving this message as a registered member of Dezaakir. You can manage your email notification preferences anytime in your Account Profile.",
  });

  const textBody = htmlToPlainText(sanitizedBodyHtml);
  const text = recipientName ? `Hello ${recipientName},\n\n${textBody}` : textBody;

  return { html, text };
}

/**
 * Sends a single customized campaign email to one recipient (with optional retry on transient failure).
 */
export async function deliverCampaignEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  await deliverEmail(
    {
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      meta: isTest ? { type: "campaign" } : undefined,
    },
    "campaign",
    { isMarketing: true },
  );
}

async function safeLookupTxt(hostname: string): Promise<string[]> {
  if (!hostname || isTest) return [];
  try {
    const records = await Promise.race([
      resolveTxt(hostname),
      new Promise<string[][]>((resolve) => setTimeout(() => resolve([]), 3000)),
    ]);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

export interface EmailDeliverabilityReport {
  checkedAt: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    tlsMinVersion: string;
    credentialsConfigured: boolean;
    connectionVerified: boolean;
  };
  sender: {
    fromAddress: string;
    senderDomain: string;
    appDomain: string;
    domainAligned: boolean;
  };
  dns: {
    spf: { status: "VERIFIED" | "MISSING" | "SKIPPED_IN_TEST"; record: string | null };
    dkim: { status: "VERIFIED" | "UNVERIFIED" | "SKIPPED_IN_TEST"; selector: string | null; record: string | null };
    dmarc: { status: "VERIFIED" | "MISSING" | "SKIPPED_IN_TEST"; record: string | null };
  };
  suppression: {
    suppressedCount: number;
    trackedBounceCount: number;
  };
  recommendations: string[];
  caveat: string;
}

export async function checkEmailDeliverability(): Promise<EmailDeliverabilityReport> {
  const fromEmail = extractSenderEmailAddress();
  const senderDomain = extractDomain(fromEmail);
  const appDomain = extractDomain(env.FRONTEND_URL);
  const domainAligned = Boolean(senderDomain && appDomain && (senderDomain === appDomain || senderDomain.endsWith(`.${appDomain}`)));

  const credentialsConfigured = Boolean(env.SMTP_USER && env.SMTP_APP_PASSWORD);
  const connectionVerified = await verifySmtpConnection();

  let spfStatus: "VERIFIED" | "MISSING" | "SKIPPED_IN_TEST" = isTest ? "SKIPPED_IN_TEST" : "MISSING";
  let spfRecord: string | null = null;
  let dkimStatus: "VERIFIED" | "UNVERIFIED" | "SKIPPED_IN_TEST" = isTest ? "SKIPPED_IN_TEST" : "UNVERIFIED";
  let dkimSelector: string | null = null;
  let dkimRecord: string | null = null;
  let dmarcStatus: "VERIFIED" | "MISSING" | "SKIPPED_IN_TEST" = isTest ? "SKIPPED_IN_TEST" : "MISSING";
  let dmarcRecord: string | null = null;

  if (!isTest && senderDomain) {
    const [rootTxt, dmarcTxt] = await Promise.all([
      safeLookupTxt(senderDomain),
      safeLookupTxt(`_dmarc.${senderDomain}`),
    ]);

    const spfMatch = rootTxt.find((r) => r.toLowerCase().startsWith("v=spf1"));
    if (spfMatch) {
      spfStatus = "VERIFIED";
      spfRecord = spfMatch;
    }

    const dmarcMatch = dmarcTxt.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
    if (dmarcMatch) {
      dmarcStatus = "VERIFIED";
      dmarcRecord = dmarcMatch;
    }

    const selectors = ["google", "default", "selector1", "s1", "k1", "resend"];
    for (const sel of selectors) {
      const txt = await safeLookupTxt(`${sel}._domainkey.${senderDomain}`);
      const match = txt.find((r) => r.toLowerCase().includes("v=dkim1") || r.toLowerCase().includes("p="));
      if (match) {
        dkimStatus = "VERIFIED";
        dkimSelector = sel;
        dkimRecord = match.slice(0, 140) + (match.length > 140 ? "..." : "");
        break;
      }
    }
  }

  const [suppressedCount, trackedBounceCount] = await Promise.all([
    EmailSuppression.countDocuments({ suppressed: true }).catch(() => 0),
    EmailSuppression.countDocuments({}).catch(() => 0),
  ]);

  const recommendations: string[] = [];
  if (!domainAligned) {
    recommendations.push(
      `Sender domain (${senderDomain || "not set"}) does not match application domain (${appDomain || "dezaakir.com"}). Using a verified domain address like no-reply@${appDomain || "dezaakir.com"} improves DMARC alignment and inbox placement.`,
    );
  }
  if (spfStatus === "MISSING") {
    recommendations.push(`No SPF TXT record (v=spf1) found for ${senderDomain || "sender domain"}. Publish an SPF record authorizing your mail servers.`);
  }
  if (dkimStatus === "UNVERIFIED") {
    recommendations.push(`No common DKIM selector record found for ${senderDomain || "sender domain"}. Enable DKIM signing in your email provider and publish the CNAME/TXT record in DNS.`);
  }
  if (dmarcStatus === "MISSING") {
    recommendations.push(`No DMARC TXT record found at _dmarc.${senderDomain || "yourdomain.com"}. Add at least "v=DMARC1; p=quarantine; rua=mailto:postmaster@${appDomain || "dezaakir.com"}".`);
  }
  if (env.SMTP_HOST.includes("gmail.com")) {
    recommendations.push(
      "Gmail SMTP is suitable for low-volume personal/transactional mail (~500/day max), but free Gmail addresses cannot pass custom-domain DMARC alignment. For higher reliability and custom-domain SPF/DKIM/DMARC, consider a dedicated transactional provider with a free tier such as Resend (3,000/mo free) or Brevo (300/day free).",
    );
  }

  return {
    checkedAt: new Date().toISOString(),
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      tlsMinVersion: "TLSv1.2",
      credentialsConfigured,
      connectionVerified,
    },
    sender: {
      fromAddress: env.EMAIL_FROM || env.SMTP_USER || "Not configured",
      senderDomain,
      appDomain,
      domainAligned,
    },
    dns: {
      spf: { status: spfStatus, record: spfRecord },
      dkim: { status: dkimStatus, selector: dkimSelector, record: dkimRecord },
      dmarc: { status: dmarcStatus, record: dmarcRecord },
    },
    suppression: {
      suppressedCount,
      trackedBounceCount,
    },
    recommendations,
    caveat:
      "SMTP acceptance confirms the mail server accepted the message for delivery; final inbox vs. spam placement is controlled by the recipient's mail provider, DNS alignment, and sender reputation.",
  };
}

export async function sendDeliverabilityTestEmail(to: string, requestedByName: string): Promise<{
  acceptedBySmtp: boolean;
  recipient: string;
  sentAt: string;
  note: string;
}> {
  const { html, text } = renderCustomAdminEmail(
    "Dezaakir Email Deliverability Diagnostic",
    `<p>This is a live SMTP diagnostic email triggered by <strong>${escapeHtml(requestedByName)}</strong> from the Dezaakir Admin Dashboard.</p><p>If you are reading this in your inbox, TLS-encrypted SMTP transport and basic delivery succeeded. Check message headers (Authentication-Results) to inspect SPF, DKIM, and DMARC alignment.</p>`,
    requestedByName,
  );
  await deliverEmail({ to, subject: "Dezaakir Email Deliverability Diagnostic", html, text, meta: isTest ? { type: "campaign" } : undefined }, "campaign");
  return {
    acceptedBySmtp: true,
    recipient: to,
    sentAt: new Date().toISOString(),
    note: "Accepted by SMTP transport. Note: SMTP acceptance does not guarantee inbox placement; verify SPF, DKIM, and DMARC alignment in message headers.",
  };
}
