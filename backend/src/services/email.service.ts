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
  meta?: { type: "otp" | "password-reset"; codeOrToken?: string };
}

const capturedEmails: CapturedEmail[] = [];

export function getCapturedEmails(): readonly CapturedEmail[] {
  if (!isTest) return [];
  return capturedEmails;
}

export function clearCapturedEmails(): void {
  capturedEmails.length = 0;
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
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Brand-compliant email layout using ONLY Navy Blue (#0B1628) and White (#FFFFFF).
 */
function renderEmailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:32px 16px;background-color:#0B1628;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#0B1628;border:1px solid #FFFFFF;border-radius:8px;">
    <tr>
      <td style="padding:32px;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;margin-bottom:16px;">
          DEZAAKIR
        </div>
        <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#FFFFFF;">
          ${escapeHtml(title)}
        </h1>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #FFFFFF;margin:28px 0 16px 0;opacity:0.25;" />
        <p style="margin:0;font-size:12px;line-height:1.5;color:#FFFFFF;opacity:0.75;">
          This is an automated security email from Dezaakir. If you did not initiate this request, you can safely ignore this message.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function deliverEmail(payload: CapturedEmail): Promise<void> {
  // Reject header injection characters in recipient or subject
  if (/[\r\n]/.test(payload.to) || /[\r\n]/.test(payload.subject)) {
    throw AppError.badRequest("Invalid email header");
  }

  if (isTest) {
    capturedEmails.push(payload);
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
    throw new AppError(503, "EMAIL_DELIVERY_FAILED", "Unable to send verification email at this time. Please try again later.");
  }
}

export async function sendVerificationOtpEmail(to: string, name: string, otpCode: string): Promise<void> {
  const subject = "Verify your Dezaakir account";
  const text = [
    `Hello ${name},`,
    "",
    `Your Dezaakir email verification code is: ${otpCode}`,
    "",
    "This six-digit code expires in 10 minutes and can only be used once.",
    "Never share this code with anyone.",
  ].join("\n");

  const html = renderEmailLayout(
    "Verify your email address",
    `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#FFFFFF;">
        Hello ${escapeHtml(name)}, use the verification code below to activate your Dezaakir account:
      </p>
      <div style="margin:24px 0;padding:18px 24px;background-color:#FFFFFF;color:#0B1628;font-family:monospace;font-size:28px;font-weight:700;letter-spacing:8px;text-align:center;border-radius:6px;">
        ${escapeHtml(otpCode)}
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#FFFFFF;">
        This code expires in <strong>10 minutes</strong> and is valid for a single use.
      </p>
    `,
  );

  await deliverEmail({
    to,
    subject,
    text,
    html,
    meta: isTest ? { type: "otp", codeOrToken: otpCode } : undefined,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, rawToken: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = "Reset your Dezaakir password";
  const text = [
    `Hello ${name},`,
    "",
    "A password reset was requested for your Dezaakir account.",
    `Reset your password using this single-use link (valid for 30 minutes):`,
    resetUrl,
    "",
    "If you did not request a password reset, no action is needed.",
  ].join("\n");

  const html = renderEmailLayout(
    "Reset your password",
    `
      <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#FFFFFF;">
        Hello ${escapeHtml(name)}, we received a request to reset the password for your Dezaakir account.
      </p>
      <div style="margin:24px 0;text-align:center;">
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:14px 28px;background-color:#FFFFFF;color:#0B1628;text-decoration:none;font-weight:600;font-size:14px;border-radius:6px;">
          Reset Password
        </a>
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#FFFFFF;">
        This link expires in <strong>30 minutes</strong> and can only be used once.
      </p>
    `,
  );

  await deliverEmail({
    to,
    subject,
    text,
    html,
    meta: isTest ? { type: "password-reset", codeOrToken: rawToken } : undefined,
  });
}
