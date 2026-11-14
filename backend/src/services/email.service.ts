import nodemailer, { type Transporter } from "nodemailer";
import { env, isProduction, isTest } from "../config/env.js";
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

async function deliverEmail(payload: CapturedEmail, captureBucket: "auth" | "campaign" = "auth"): Promise<void> {
  // Reject header injection characters in recipient or subject
  if (/[\r\n]/.test(payload.to) || /[\r\n]/.test(payload.subject)) {
    throw AppError.badRequest("Invalid email header");
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

  try {
    await getTransporter().sendMail({
      from: env.EMAIL_FROM || env.SMTP_USER,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    logger.info({ subject: payload.subject }, "Transactional email sent via Gmail SMTP");
  } catch (err) {
    logger.error({ errName: err instanceof Error ? err.name : "SmtpError" }, "Failed to send email via Gmail SMTP");
    throw new AppError(503, "EMAIL_DELIVERY_FAILED", "Unable to send email at this time. Please try again later.");
  }
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
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await deliverEmail(
        {
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          meta: isTest ? { type: "campaign" } : undefined,
        },
        "campaign",
      );
      return;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Email delivery failed");
}
