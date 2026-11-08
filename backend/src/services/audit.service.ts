import type { Request } from "express";
import type { Types } from "mongoose";
import { AuditLog, type AuditCategory, type AuditOutcome } from "../models/index.js";
import { logger } from "../utils/logger.js";

const FORBIDDEN_METADATA_KEYS = /password|otp|code|token|secret|cookie|authorization|smtp/i;

export interface AuditInput {
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
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

  try {
    await AuditLog.create({
      category: input.category,
      action: input.action,
      outcome: input.outcome,
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
