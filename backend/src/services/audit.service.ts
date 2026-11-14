import type { Request } from "express";
import type { Types } from "mongoose";
import { AuditLog, SiteSettings, type AuditCategory, type AuditOutcome, type AuditSeverity } from "../models/index.js";
import { logger } from "../utils/logger.js";

const FORBIDDEN_METADATA_KEYS = /password|otp|code|token|secret|cookie|authorization|smtp/i;

const HIGH_SEVERITY_ACTIONS = new Set([
  "auth.login_locked",
  "auth.otp_max_attempts",
  "security.rbac_denied",
  "security.csrf_origin_mismatch",
  "security.csrf_token_missing",
  "security.csrf_token_mismatch",
  "admin.suspend_privileged_denied",
  "auth.login_suspended",
]);

const MEDIUM_SEVERITY_ACTIONS = new Set([
  "auth.login_failed",
  "auth.otp_invalid",
  "contact.honeypot_dropped",
  "admin.user_suspended",
]);

let cachedAuditRetentionDays = 90;
let retentionCachedAt = 0;

async function getAuditRetentionDays(): Promise<number> {
  const now = Date.now();
  if (now - retentionCachedAt < 60_000) {
    return cachedAuditRetentionDays;
  }
  try {
    const settings = await SiteSettings.findOne({ key: "site" }).select("retention.auditLogDays").lean();
    if (settings?.retention?.auditLogDays) {
      cachedAuditRetentionDays = settings.retention.auditLogDays;
    }
  } catch {
    // Keep cached fallback on transient DB read
  }
  retentionCachedAt = now;
  return cachedAuditRetentionDays;
}

export interface AuditInput {
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  suspicious?: boolean;
  severity?: AuditSeverity;
  actor?: Types.ObjectId | string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  req?: Request;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

function sanitizeMetadata(
  input?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> | undefined {
  if (!input) return undefined;
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_METADATA_KEYS.test(key) || value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      clean[key] = typeof value === "string" ? value.slice(0, 300) : value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const metadata = sanitizeMetadata(input.metadata);
  const ip = input.req?.ip?.slice(0, 64);
  const userAgent = input.req?.get("user-agent")?.slice(0, 300);
  const requestId = input.req?.id;

  logger.info(
    {
      audit: {
        category: input.category,
        action: input.action,
        outcome: input.outcome,
        actor: input.actor ? String(input.actor) : undefined,
        actorEmail: input.actorEmail,
        targetType: input.targetType,
        targetId: input.targetId,
        ip,
        requestId,
        metadata,
      },
    },
    `Audit: ${input.action} (${input.outcome})`,
  );

  const severity: AuditSeverity =
    input.severity ??
    (HIGH_SEVERITY_ACTIONS.has(input.action)
      ? "HIGH"
      : MEDIUM_SEVERITY_ACTIONS.has(input.action)
        ? "MEDIUM"
        : "LOW");
  const suspicious =
    input.suspicious ??
    (HIGH_SEVERITY_ACTIONS.has(input.action) ||
      MEDIUM_SEVERITY_ACTIONS.has(input.action) ||
      input.outcome === "DENIED");

  try {
    const retentionDays = await getAuditRetentionDays();
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    await AuditLog.create({
      category: input.category,
      action: input.action,
      outcome: input.outcome,
      suspicious,
      severity,
      expiresAt,
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.actorEmail ? { actorEmail: input.actorEmail } : {}),
      ...(input.targetType ? { targetType: input.targetType } : {}),
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(ip ? { ip } : {}),
      ...(userAgent ? { userAgent } : {}),
      ...(requestId ? { requestId } : {}),
      ...(metadata ? { metadata } : {}),
    });
  } catch (err) {
    logger.error({ errName: err instanceof Error ? err.name : "Unknown", action: input.action }, "Failed to persist audit log");
  }
}
