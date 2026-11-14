import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

export const AUDIT_CATEGORIES = ["AUTH", "ADMIN", "SECURITY", "SYSTEM"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];
export const AUDIT_OUTCOMES = ["SUCCESS", "FAILURE", "DENIED"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

/** Retention for audit records (MongoDB TTL). */
export const AUDIT_RETENTION_DAYS = 365;

export const AUDIT_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

/**
 * Append-only security/audit trail. `metadata` must never contain passwords,
 * OTPs, tokens or cookies — the audit service enforces an allow-list.
 */
export interface IAuditLog {
  _id: Types.ObjectId;
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  suspicious?: boolean;
  severity?: AuditSeverity;
  actor?: Types.ObjectId;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  expiresAt?: Date;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    category: { type: String, enum: AUDIT_CATEGORIES, required: true },
    action: { type: String, required: true, maxlength: 80, match: /^[a-z0-9_.]+$/ },
    outcome: { type: String, enum: AUDIT_OUTCOMES, required: true },
    suspicious: { type: Boolean, default: false, index: true },
    severity: { type: String, enum: AUDIT_SEVERITIES, default: "LOW" },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String, maxlength: 254 },
    targetType: { type: String, maxlength: 40 },
    targetId: { type: String, maxlength: 64 },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 300 },
    requestId: { type: String, maxlength: 64 },
    metadata: { type: Schema.Types.Mixed },
    expiresAt: { type: Date },
  },
  baseOptions<IAuditLog>({ timestamps: { createdAt: true, updatedAt: false } }),
);

// Append-only: block updates through Mongoose.
AuditLogSchema.pre(["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"], function () {
  throw new Error("Audit logs are append-only");
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ outcome: 1, createdAt: -1 });
AuditLogSchema.index({ suspicious: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: AUDIT_RETENTION_DAYS * 24 * 3600, name: "audit_ttl" });
AuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "audit_expires_ttl" });

export const AuditLog: Model<IAuditLog> = model<IAuditLog>("AuditLog", AuditLogSchema);
