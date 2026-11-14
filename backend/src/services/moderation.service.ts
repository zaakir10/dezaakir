import type { Request } from "express";
import {
  ModerationLog,
  Session,
  User,
  type IModerationLog,
  type IUser,
  type SuspensionDuration,
} from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { escapeRegex, normalizePage, toObjectId, trusted } from "../utils/query.js";
import { recordAudit } from "./audit.service.js";
import { sendSecurityNotificationEmail } from "./email.service.js";

const DURATION_MS: Record<"1H" | "24H" | "7D" | "30D", number> = {
  "1H": 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "30D": 30 * 24 * 60 * 60 * 1000,
};

export function formatSuspensionMessage(user: Pick<IUser, "status" | "suspension">): string {
  const susp = user.suspension;
  if (!susp) {
    return "Your account is currently suspended. Please contact an administrator.";
  }
  if (susp.type === "PERMANENT") {
    return `Your account has been permanently suspended. Reason: ${susp.reason}`;
  }
  const until = susp.expiresAt ? new Date(susp.expiresAt).toISOString() : "further notice";
  return `Your account is temporarily suspended until ${until}. Reason: ${susp.reason}`;
}

/**
 * Checks whether a user is currently suspended.
 * If a temporary suspension has expired, automatically reinstates the account
 * in MongoDB and records both a ModerationLog and an AuditLog entry.
 */
export async function evaluateUserSuspension(
  user: IUser,
  req?: Request,
): Promise<{ suspended: boolean; user: IUser; message?: string }> {
  if (user.status !== "SUSPENDED") {
    return { suspended: false, user };
  }

  const now = new Date();
  if (user.suspension?.type === "TEMPORARY" && user.suspension.expiresAt && new Date(user.suspension.expiresAt) <= now) {
    const nextStatus = user.emailVerified ? "ACTIVE" : "PENDING";
    const updated = await User.findOneAndUpdate(
      { _id: user._id, status: "SUSPENDED" },
      { $set: { status: nextStatus }, $unset: { suspension: 1 } },
      { returnDocument: "after" },
    ).lean<IUser>();

    await ModerationLog.create({
      user: user._id,
      userEmail: user.email,
      userName: user.name,
      action: "AUTO_REINSTATED",
      durationType: "AUTO",
      reason: "Temporary suspension expired automatically",
      expiresAt: user.suspension.expiresAt,
      actorEmail: "system@dezaakir.com",
    });

    await recordAudit({
      category: "ADMIN",
      action: "user.auto_reinstated",
      outcome: "SUCCESS",
      actor: user._id,
      actorEmail: user.email,
      targetType: "User",
      targetId: String(user._id),
      req,
      metadata: {
        previousReason: user.suspension.reason,
        expiredAt: new Date(user.suspension.expiresAt).toISOString(),
      },
    });

    return {
      suspended: false,
      user: updated ?? { ...user, status: nextStatus, suspension: undefined },
    };
  }

  return {
    suspended: true,
    user,
    message: formatSuspensionMessage(user),
  };
}

export async function suspendUserAccount(
  targetUserId: string,
  input: {
    duration: "1H" | "24H" | "7D" | "30D" | "PERMANENT";
    reason: string;
    notes?: string;
  },
  req: Request,
) {
  const actor = req.user;
  if (!actor) throw AppError.unauthorized("Authentication required");

  const objId = toObjectId(targetUserId);
  if (String(objId) === String(actor._id)) {
    throw new AppError(400, "SELF_MODERATION_FORBIDDEN", "Administrators cannot suspend their own account");
  }

  const target = await User.findById(objId).lean<IUser>();
  if (!target) throw AppError.notFound("User not found");

  if (target.role === "SUPER_ADMIN" || (target.role === "ADMIN" && actor.role !== "SUPER_ADMIN")) {
    await recordAudit({
      category: "SECURITY",
      action: "admin.suspend_privileged_denied",
      outcome: "DENIED",
      actor: actor._id,
      actorEmail: actor.email,
      targetType: "User",
      targetId: targetUserId,
      req,
      metadata: { targetRole: target.role },
    });
    throw AppError.forbidden("Privileged administrator accounts are protected from unauthorized suspension");
  }

  const now = new Date();
  const isPermanent = input.duration === "PERMANENT";
  const expiresAt =
    input.duration === "PERMANENT"
      ? undefined
      : new Date(now.getTime() + DURATION_MS[input.duration]);

  const updated = await User.findByIdAndUpdate(
    objId,
    {
      $set: {
        status: "SUSPENDED",
        suspension: {
          type: isPermanent ? "PERMANENT" : "TEMPORARY",
          reason: input.reason.trim(),
          ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
          suspendedAt: now,
          ...(expiresAt ? { expiresAt } : {}),
          suspendedBy: actor._id,
          suspendedByEmail: actor.email,
        },
      },
    },
    { returnDocument: "after" },
  ).lean<IUser>();

  // Immediately revoke all active sessions for the suspended user
  await Session.updateMany(
    { user: objId, revokedAt: trusted({ $exists: false }) },
    { $set: { revokedAt: now } },
  );

  await ModerationLog.create({
    user: objId,
    userEmail: target.email,
    userName: target.name,
    action: "SUSPENDED",
    durationType: input.duration as SuspensionDuration,
    reason: input.reason.trim(),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    actor: actor._id,
    actorEmail: actor.email,
  });

  await recordAudit({
    category: "ADMIN",
    action: "admin.user_suspended",
    outcome: "SUCCESS",
    actor: actor._id,
    actorEmail: actor.email,
    targetType: "User",
    targetId: targetUserId,
    req,
    metadata: {
      duration: input.duration,
      reason: input.reason.trim(),
      expiresAt: expiresAt ? expiresAt.toISOString() : "PERMANENT",
    },
  });

  if (target.preferences?.securityAlerts !== false) {
    const expiryLabel = expiresAt ? `until ${expiresAt.toUTCString()}` : "permanently";
    void sendSecurityNotificationEmail(
      target.email,
      target.name,
      "Account Suspension Notice",
      `Your Dezaakir account has been suspended ${expiryLabel}. Reason: ${input.reason.trim()}`,
    ).catch(() => undefined);
  }

  return updated;
}

export async function reinstateUserAccount(
  targetUserId: string,
  input: { reason?: string; notes?: string },
  req: Request,
) {
  const actor = req.user;
  if (!actor) throw AppError.unauthorized("Authentication required");

  const objId = toObjectId(targetUserId);
  if (String(objId) === String(actor._id)) {
    throw new AppError(400, "SELF_MODERATION_FORBIDDEN", "Administrators cannot modify their own moderation status");
  }

  const target = await User.findById(objId).lean<IUser>();
  if (!target) throw AppError.notFound("User not found");
  if (target.status !== "SUSPENDED") {
    throw AppError.badRequest("User account is not currently suspended");
  }

  const nextStatus = target.emailVerified ? "ACTIVE" : "PENDING";
  const updated = await User.findByIdAndUpdate(
    objId,
    { $set: { status: nextStatus }, $unset: { suspension: 1 } },
    { returnDocument: "after" },
  ).lean<IUser>();

  const reason = input.reason?.trim() || "Reinstated by administrator";
  await ModerationLog.create({
    user: objId,
    userEmail: target.email,
    userName: target.name,
    action: "REINSTATED",
    durationType: "MANUAL",
    reason,
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    actor: actor._id,
    actorEmail: actor.email,
  });

  await recordAudit({
    category: "ADMIN",
    action: "admin.user_reinstated",
    outcome: "SUCCESS",
    actor: actor._id,
    actorEmail: actor.email,
    targetType: "User",
    targetId: targetUserId,
    req,
    metadata: { reason, restoredStatus: nextStatus },
  });

  if (target.preferences?.securityAlerts !== false) {
    void sendSecurityNotificationEmail(
      target.email,
      target.name,
      "Account Reinstated",
      `Your Dezaakir account suspension has been lifted by an administrator. You may now sign in normally.`,
    ).catch(() => undefined);
  }

  return updated;
}

export async function listModerationHistory(query: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: "SUSPENDED" | "REINSTATED" | "AUTO_REINSTATED";
  search?: string;
}) {
  const { page, limit } = normalizePage(query.page, query.limit, 100);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (query.userId) filter.user = toObjectId(query.userId);
  if (query.action) filter.action = query.action;
  if (query.search?.trim()) {
    const rx = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ userEmail: rx }, { userName: rx }, { reason: rx }, { actorEmail: rx }];
  }

  const [logs, total] = await Promise.all([
    ModerationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IModerationLog[]>(),
    ModerationLog.countDocuments(filter),
  ]);

  return {
    logs,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
