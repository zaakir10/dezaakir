import type { Request } from "express";
import {
  AuditLog,
  Blog,
  ContactMessage,
  Media,
  Project,
  Session,
  User,
} from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import type { PaginationMeta } from "../utils/apiResponse.js";
import { escapeRegex, normalizePage, toObjectId, trusted } from "../utils/query.js";
import { recordAudit } from "./audit.service.js";
import type { z } from "zod";
import type {
  listAuditLogsQuerySchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
} from "../validators/admin.validator.js";

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

function serializeSafeUser(doc: { toJSON: () => unknown; _id: unknown }): Record<string, unknown> {
  const json = doc.toJSON() as Record<string, unknown>;
  delete json.passwordHash;
  if (json.mfa && typeof json.mfa === "object") {
    const mfaObj = { ...(json.mfa as Record<string, unknown>) };
    delete mfaObj.secretEncrypted;
    delete mfaObj.recoveryCodesHash;
    json.mfa = mfaObj;
  }
  return {
    ...json,
    _id: String(doc._id),
    id: String(doc._id),
  };
}

export async function getAdminOverview() {
  const [
    totalBlogs,
    publishedBlogs,
    draftBlogs,
    scheduledBlogs,
    totalProjects,
    publishedProjects,
    draftProjects,
    totalUsers,
    unverifiedUsers,
    suspendedUsers,
    totalMessages,
    unreadMessages,
    totalMedia,
    recentLogs,
  ] = await Promise.all([
    Blog.countDocuments({}),
    Blog.countDocuments({ status: "PUBLISHED" }),
    Blog.countDocuments({ status: "DRAFT" }),
    Blog.countDocuments({ status: "SCHEDULED" }),
    Project.countDocuments({}),
    Project.countDocuments({ status: "PUBLISHED" }),
    Project.countDocuments({ status: "DRAFT" }),
    User.countDocuments({}),
    User.countDocuments({ emailVerified: false }),
    User.countDocuments({ status: "SUSPENDED" }),
    ContactMessage.countDocuments({}),
    ContactMessage.countDocuments({ status: "NEW" }),
    Media.countDocuments({}),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("actor", "name email role"),
  ]);

  return {
    stats: {
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      scheduledBlogs,
      totalProjects,
      publishedProjects,
      draftProjects,
      totalUsers,
      unverifiedUsers,
      suspendedUsers,
      totalMessages,
      unreadMessages,
      totalMedia,
    },
    recentActivity: recentLogs.map((log) => {
      const json = log.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(log._id), id: String(log._id) };
    }),
  };
}

export async function listAdminUsers(query: ListUsersQuery): Promise<{
  users: Record<string, unknown>[];
  meta: PaginationMeta;
}> {
  const { page, limit } = normalizePage(query.page, query.limit, 100);
  const filter: Record<string, unknown> = {};

  if (query.role) {
    filter.role = query.role;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.emailVerified !== undefined) {
    filter.emailVerified = query.emailVerified;
  }
  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { name: trusted({ $regex: safePattern }) },
      { email: trusted({ $regex: safePattern }) },
    ]);
  }

  const [total, docs] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    users: docs.map((d) => serializeSafeUser(d)),
    meta: { page, limit, total, totalPages },
  };
}

export async function getAdminUserDetails(userId: string) {
  const objectId = toObjectId(userId);
  const user = await User.findById(objectId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  const now = new Date();
  const [activeSessions, recentAuditLogs] = await Promise.all([
    Session.find({
      user: user._id,
      revokedAt: trusted({ $exists: false }),
      expiresAt: trusted({ $gt: now }),
    }).sort({ lastSeenAt: -1 }),
    AuditLog.find({ actor: user._id }).sort({ createdAt: -1 }).limit(20),
  ]);

  return {
    user: serializeSafeUser(user),
    sessions: activeSessions.map((s) => {
      const json = s.toJSON() as unknown as Record<string, unknown>;
      delete json.tokenHash;
      delete json.csrfTokenHash;
      return { ...json, _id: String(s._id), id: String(s._id) };
    }),
    recentActivity: recentAuditLogs.map((l) => {
      const json = l.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(l._id), id: String(l._id) };
    }),
  };
}

export async function updateAdminUserStatus(
  targetUserId: string,
  input: UpdateUserStatusInput,
  req: Request
) {
  const objectId = toObjectId(targetUserId);
  const user = await User.findById(objectId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  const actorId = String(req.user!._id);
  const isSelf = String(user._id) === actorId;

  if (
    isSelf &&
    (input.status === "SUSPENDED" ||
      input.status === "PENDING" ||
      input.emailVerified === false)
  ) {
    throw new AppError(
      400,
      "SELF_LOCKOUT_FORBIDDEN",
      "Administrators cannot suspend or unverify their own active account"
    );
  }

  const previousStatus = user.status;
  const previousVerified = user.emailVerified;

  if (input.status !== undefined) {
    user.status = input.status;
  }
  if (input.emailVerified !== undefined) {
    user.emailVerified = input.emailVerified;
    if (input.emailVerified && user.status === "PENDING" && input.status === undefined) {
      user.status = "ACTIVE";
    }
  }

  await user.save();

  const shouldRevokeSessions =
    input.revokeSessions === true || user.status === "SUSPENDED";

  let revokedCount = 0;
  if (shouldRevokeSessions) {
    const now = new Date();
    const res = await Session.updateMany(
      {
        user: user._id,
        revokedAt: trusted({ $exists: false }),
      },
      {
        $set: {
          revokedAt: now,
        },
      }
    );
    revokedCount = res.modifiedCount;
  }

  await recordAudit({
    category: "ADMIN",
    action: "admin.user_status_update",
    outcome: "SUCCESS",
    actor: req.user!._id,
    actorEmail: req.user!.email,
    targetType: "User",
    targetId: String(user._id),
    req,
    metadata: {
      previousStatus,
      newStatus: user.status,
      previousVerified,
      newVerified: user.emailVerified,
      revokedSessions: revokedCount,
    },
  });

  return {
    user: serializeSafeUser(user),
    revokedSessions: revokedCount,
  };
}

export async function revokeUserSessionsByAdmin(targetUserId: string, req: Request) {
  const objectId = toObjectId(targetUserId);
  const user = await User.findById(objectId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  const now = new Date();
  const res = await Session.updateMany(
    {
      user: user._id,
      revokedAt: trusted({ $exists: false }),
    },
    {
      $set: {
        revokedAt: now,
      },
    }
  );

  await recordAudit({
    category: "ADMIN",
    action: "admin.user_sessions_revoke",
    outcome: "SUCCESS",
    actor: req.user!._id,
    actorEmail: req.user!.email,
    targetType: "User",
    targetId: String(user._id),
    req,
    metadata: {
      revokedSessions: res.modifiedCount,
    },
  });

  return {
    userId: String(user._id),
    revokedSessions: res.modifiedCount,
  };
}

export async function listAuditLogs(query: ListAuditLogsQuery): Promise<{
  logs: Record<string, unknown>[];
  meta: PaginationMeta;
}> {
  const { page, limit } = normalizePage(query.page, query.limit, 100);
  const filter: Record<string, unknown> = {};

  if (query.category) {
    filter.category = query.category;
  }
  if (query.outcome) {
    filter.outcome = query.outcome;
  }
  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { action: trusted({ $regex: safePattern }) },
      { actorEmail: trusted({ $regex: safePattern }) },
      { targetType: trusted({ $regex: safePattern }) },
    ]);
  }

  const [total, docs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("actor", "name email role"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    logs: docs.map((d) => {
      const json = d.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(d._id), id: String(d._id) };
    }),
    meta: { page, limit, total, totalPages },
  };
}
