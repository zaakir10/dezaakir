import type { Request } from "express";
import { env } from "../config/env.js";
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
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

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
    blogsLast30d,
    blogsPrev30d,
    projectsLast30d,
    projectsPrev30d,
    usersLast30d,
    usersPrev30d,
    messagesLast30d,
    messagesPrev30d,
    recentLogs,
    recentBlogDocs,
    recentProjectDocs,
    recentUserDocs,
    recentMessageDocs,
    blogsForSeries,
    projectsForSeries,
    usersForSeries,
    messagesForSeries,
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
    Blog.countDocuments({ createdAt: trusted({ $gte: thirtyDaysAgo }) }),
    Blog.countDocuments({ createdAt: trusted({ $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }) }),
    Project.countDocuments({ createdAt: trusted({ $gte: thirtyDaysAgo }) }),
    Project.countDocuments({ createdAt: trusted({ $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }) }),
    User.countDocuments({ createdAt: trusted({ $gte: thirtyDaysAgo }) }),
    User.countDocuments({ createdAt: trusted({ $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }) }),
    ContactMessage.countDocuments({ createdAt: trusted({ $gte: thirtyDaysAgo }) }),
    ContactMessage.countDocuments({ createdAt: trusted({ $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }) }),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("actor", "name email role"),
    Blog.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("category", "name slug")
      .populate("author", "name"),
    Project.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("category", "name slug"),
    User.find({})
      .sort({ createdAt: -1 })
      .limit(5),
    ContactMessage.find({})
      .sort({ createdAt: -1 })
      .limit(5),
    Blog.find({ createdAt: trusted({ $gte: sixMonthsAgo }) }).select("status createdAt publishedAt").lean(),
    Project.find({ createdAt: trusted({ $gte: sixMonthsAgo }) }).select("status createdAt publishedAt").lean(),
    User.find({ createdAt: trusted({ $gte: sixMonthsAgo }) }).select("createdAt").lean(),
    ContactMessage.find({ createdAt: trusted({ $gte: sixMonthsAgo }) }).select("createdAt").lean(),
  ]);

  // Build 6-month buckets from real database timestamps
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlySeries: {
    monthKey: string;
    label: string;
    blogsCreated: number;
    blogsPublished: number;
    projectsCreated: number;
    projectsPublished: number;
    usersRegistered: number;
    messagesReceived: number;
  }[] = [];
  const bucketMap = new Map<string, (typeof monthlySeries)[number]>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const bucket = {
      monthKey: key,
      label,
      blogsCreated: 0,
      blogsPublished: 0,
      projectsCreated: 0,
      projectsPublished: 0,
      usersRegistered: 0,
      messagesReceived: 0,
    };
    monthlySeries.push(bucket);
    bucketMap.set(key, bucket);
  }

  const getKey = (dt?: Date | string) => {
    if (!dt) return "";
    const d = new Date(dt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  for (const b of blogsForSeries) {
    const cBucket = bucketMap.get(getKey(b.createdAt));
    if (cBucket) cBucket.blogsCreated += 1;
    if (b.status === "PUBLISHED") {
      const pBucket = bucketMap.get(getKey(b.publishedAt ?? b.createdAt));
      if (pBucket) pBucket.blogsPublished += 1;
    }
  }

  for (const p of projectsForSeries) {
    const cBucket = bucketMap.get(getKey(p.createdAt));
    if (cBucket) cBucket.projectsCreated += 1;
    if (p.status === "PUBLISHED") {
      const pBucket = bucketMap.get(getKey(p.publishedAt ?? p.createdAt));
      if (pBucket) pBucket.projectsPublished += 1;
    }
  }

  for (const u of usersForSeries) {
    const uBucket = bucketMap.get(getKey(u.createdAt));
    if (uBucket) uBucket.usersRegistered += 1;
  }

  for (const m of messagesForSeries) {
    const mBucket = bucketMap.get(getKey(m.createdAt));
    if (mBucket) mBucket.messagesReceived += 1;
  }

  const activeUsers = Math.max(0, totalUsers - suspendedUsers - unverifiedUsers);
  const enrichedSeries = monthlySeries.map((pt) => ({
    ...pt,
    key: pt.monthKey,
    blogsTotal: pt.blogsCreated,
    projectsTotal: pt.projectsCreated,
  }));

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
      blogs: {
        total: totalBlogs,
        published: publishedBlogs,
        drafts: draftBlogs,
        scheduled: scheduledBlogs,
      },
      projects: {
        total: totalProjects,
        published: publishedProjects,
        drafts: draftProjects,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        admins: 1,
      },
      messages: {
        total: totalMessages,
        unread: unreadMessages,
      },
      media: {
        total: totalMedia,
      },
    },
    comparisons: {
      blogsLast30d,
      blogsPrev30d,
      projectsLast30d,
      projectsPrev30d,
      usersLast30d,
      usersPrev30d,
      messagesLast30d,
      messagesPrev30d,
      blogsCreated: { last30Days: blogsLast30d, prev30Days: blogsPrev30d },
      blogsPublished: { last30Days: publishedBlogs, prev30Days: blogsPrev30d },
      projectsCreated: { last30Days: projectsLast30d, prev30Days: projectsPrev30d },
      usersRegistered: { last30Days: usersLast30d, prev30Days: usersPrev30d },
      messagesReceived: { last30Days: messagesLast30d, prev30Days: messagesPrev30d },
    },
    monthlySeries: enrichedSeries,
    recentBlogs: recentBlogDocs.map((d) => {
      const json = d.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(d._id), id: String(d._id) };
    }),
    recentProjects: recentProjectDocs.map((d) => {
      const json = d.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(d._id), id: String(d._id) };
    }),
    recentUsers: recentUserDocs.map((d) => serializeSafeUser(d)),
    recentMessages: recentMessageDocs.map((d) => {
      const json = d.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(d._id), id: String(d._id) };
    }),
    recentActivity: recentLogs.map((log) => {
      const json = log.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(log._id), id: String(log._id) };
    }),
    systemStatus: {
      smtpConfigured: Boolean(env.SMTP_USER && env.SMTP_APP_PASSWORD),
      emailConfigured: Boolean(env.SMTP_USER && env.SMTP_APP_PASSWORD),
      smtpHost: env.SMTP_HOST,
      smtpPort: env.SMTP_PORT,
      emailFrom: env.EMAIL_FROM,
      cloudinaryConfigured: Boolean(
        env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
      ),
      cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME || null,
      frontendUrl: env.FRONTEND_URL,
      nodeEnv: env.NODE_ENV,
      environment: env.NODE_ENV,
    },
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
