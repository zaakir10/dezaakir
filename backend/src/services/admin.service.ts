import type { Request } from "express";
import type { z } from "zod";
import { env } from "../config/env.js";
import {
  AuditLog,
  Blog,
  ContactMessage,
  EmailCampaign,
  Media,
  Project,
  Session,
  User,
  type ICampaignRecipient,
  type IUser,
} from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import type { PaginationMeta } from "../utils/apiResponse.js";
import { escapeRegex, normalizePage, toObjectId, trusted } from "../utils/query.js";
import { sanitizePlainText, sanitizeRichHtml } from "../utils/sanitizeHtml.js";
import type {
  listAuditLogsQuerySchema,
  listEmailCampaignsQuerySchema,
  listUsersQuerySchema,
  previewAdminEmailSchema,
  sendAdminEmailSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "../validators/admin.validator.js";
import { recordAudit } from "./audit.service.js";
import { parseDeviceName } from "./auth.service.js";
import {
  deliverCampaignEmail,
  htmlToPlainText,
  renderCustomAdminEmail,
  sendRoleChangeNotificationEmail,
} from "./email.service.js";

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type PreviewAdminEmailInput = z.infer<typeof previewAdminEmailSchema>;
export type SendAdminEmailInput = z.infer<typeof sendAdminEmailSchema>;
export type ListEmailCampaignsQuery = z.infer<typeof listEmailCampaignsQuerySchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

function serializeSafeUser(doc: { toJSON: () => unknown; _id: unknown }): Record<string, unknown> {
  const json = doc.toJSON() as Record<string, unknown>;
  delete json.passwordHash;
  if (json.mfa && typeof json.mfa === "object") {
    const mfaObj = { ...(json.mfa as Record<string, unknown>) };
    delete mfaObj.secretEncrypted;
    delete mfaObj.recoveryCodesHash;
    delete mfaObj.recoveryCodeHashes;
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
    verifiedUsers,
    unverifiedUsers,
    suspendedUsers,
    adminUsers,
    editorUsers,
    totalMessages,
    unreadMessages,
    totalMedia,
    totalEmailCampaigns,
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
    User.countDocuments({ emailVerified: true }),
    User.countDocuments({ emailVerified: false }),
    User.countDocuments({ status: "SUSPENDED" }),
    User.countDocuments({ role: trusted({ $in: ["ADMIN", "SUPER_ADMIN"] }) }),
    User.countDocuments({ role: "EDITOR" }),
    ContactMessage.countDocuments({}),
    ContactMessage.countDocuments({ status: "NEW" }),
    Media.countDocuments({}),
    EmailCampaign.countDocuments({}),
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
      .limit(6),
    ContactMessage.find({})
      .sort({ createdAt: -1 })
      .limit(6),
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
      verifiedUsers,
      unverifiedUsers,
      suspendedUsers,
      adminUsers,
      editorUsers,
      totalMessages,
      unreadMessages,
      totalMedia,
      totalEmailCampaigns,
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
        verified: verifiedUsers,
        unverified: unverifiedUsers,
        suspended: suspendedUsers,
        admins: adminUsers,
        editors: editorUsers,
        newLast30d: usersLast30d,
      },
      messages: {
        total: totalMessages,
        unread: unreadMessages,
      },
      media: {
        total: totalMedia,
      },
      emails: {
        totalCampaigns: totalEmailCampaigns,
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
        env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
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
  summary: {
    total: number;
    USER: number;
    EDITOR: number;
    ADMIN: number;
    SUPER_ADMIN: number;
    verified: number;
    unverified: number;
    active: number;
    suspended: number;
  };
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

  const sortField = query.sortBy ?? "createdAt";
  const sortDirection = query.sortOrder === "asc" ? 1 : -1;
  const sortSpec: Record<string, 1 | -1> = { [sortField]: sortDirection };
  if (sortField !== "createdAt") {
    sortSpec.createdAt = -1;
  }

  const [
    total,
    docs,
    allTotal,
    roleUserCount,
    roleEditorCount,
    roleAdminCount,
    roleSuperAdminCount,
    verifiedCount,
    unverifiedCount,
    activeCount,
    suspendedCount,
  ] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments({}),
    User.countDocuments({ role: "USER" }),
    User.countDocuments({ role: "EDITOR" }),
    User.countDocuments({ role: "ADMIN" }),
    User.countDocuments({ role: "SUPER_ADMIN" }),
    User.countDocuments({ emailVerified: true }),
    User.countDocuments({ emailVerified: false }),
    User.countDocuments({ status: "ACTIVE" }),
    User.countDocuments({ status: "SUSPENDED" }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    users: docs.map((d) => serializeSafeUser(d)),
    summary: {
      total: allTotal,
      USER: roleUserCount,
      EDITOR: roleEditorCount,
      ADMIN: roleAdminCount,
      SUPER_ADMIN: roleSuperAdminCount,
      verified: verifiedCount,
      unverified: unverifiedCount,
      active: activeCount,
      suspended: suspendedCount,
    },
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
      return {
        ...json,
        _id: String(s._id),
        id: String(s._id),
        deviceName: parseDeviceName(s.userAgent),
      };
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
  req: Request,
) {
  const objectId = toObjectId(targetUserId);
  const user = await User.findById(objectId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  const actor = req.user!;
  const actorId = String(actor._id);
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
      "Administrators cannot suspend or unverify their own active account",
    );
  }

  if (user.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN" && input.status === "SUSPENDED") {
    throw AppError.forbidden("Only a Super Admin can suspend another Super Admin account");
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
      },
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

/**
 * Updates a user's RBAC role (`USER`, `EDITOR`, `ADMIN`, `SUPER_ADMIN`) with strict privilege-escalation
 * and last-administrator protections.
 */
export async function updateAdminUserRole(
  targetUserId: string,
  input: UpdateUserRoleInput,
  req: Request,
) {
  const objectId = toObjectId(targetUserId);
  const user = await User.findById(objectId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  const actor = req.user!;
  const actorId = String(actor._id);
  const isSelf = String(user._id) === actorId;

  // 1. Never allow an administrator to elevate or demote their own role
  if (isSelf) {
    await recordAudit({
      category: "SECURITY",
      action: "admin.user_role_self_change_blocked",
      outcome: "DENIED",
      actor: actor._id,
      actorEmail: actor.email,
      targetType: "User",
      targetId: String(user._id),
      req,
      metadata: { currentRole: user.role, requestedRole: input.role },
    });
    throw new AppError(
      400,
      "SELF_ROLE_CHANGE_FORBIDDEN",
      "Administrators cannot modify their own role privileges",
    );
  }

  const previousRole = user.role;
  const newRole = input.role;

  if (previousRole === newRole) {
    return {
      user: serializeSafeUser(user),
      previousRole,
      newRole,
    };
  }

  const activeSuperAdminCount = await User.countDocuments({
    role: "SUPER_ADMIN",
    status: "ACTIVE",
  });

  // 2. Least-privilege check: only a SUPER_ADMIN (or primary ADMIN when zero SUPER_ADMINs exist) can grant or revoke SUPER_ADMIN
  if (previousRole === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    await recordAudit({
      category: "SECURITY",
      action: "admin.user_role_escalation_blocked",
      outcome: "DENIED",
      actor: actor._id,
      actorEmail: actor.email,
      targetType: "User",
      targetId: String(user._id),
      req,
      metadata: { previousRole, requestedRole: newRole },
    });
    throw AppError.forbidden("Only a Super Admin is authorized to modify another Super Admin account");
  }

  if (newRole === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN" && activeSuperAdminCount > 0) {
    await recordAudit({
      category: "SECURITY",
      action: "admin.user_role_escalation_blocked",
      outcome: "DENIED",
      actor: actor._id,
      actorEmail: actor.email,
      targetType: "User",
      targetId: String(user._id),
      req,
      metadata: { previousRole, requestedRole: newRole },
    });
    throw AppError.forbidden("Only a Super Admin can grant Super Admin privileges");
  }

  // 3. Prevent accidental removal of the last active SUPER_ADMIN
  if (previousRole === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN" && activeSuperAdminCount <= 1) {
    throw new AppError(
      400,
      "LAST_SUPER_ADMIN_FORBIDDEN",
      "Cannot demote the last active Super Admin account",
    );
  }

  // 4. Prevent accidental removal of the last active Administrator (ADMIN or SUPER_ADMIN)
  const wasPrivilegedAdmin = previousRole === "ADMIN" || previousRole === "SUPER_ADMIN";
  const willBePrivilegedAdmin = newRole === "ADMIN" || newRole === "SUPER_ADMIN";
  if (wasPrivilegedAdmin && !willBePrivilegedAdmin) {
    const activeAdminCount = await User.countDocuments({
      role: trusted({ $in: ["ADMIN", "SUPER_ADMIN"] }),
      status: "ACTIVE",
    });
    if (activeAdminCount <= 1) {
      throw new AppError(
        400,
        "LAST_ADMIN_FORBIDDEN",
        "Cannot demote the last active Administrator account",
      );
    }
  }

  user.role = newRole;
  await user.save();

  await recordAudit({
    category: "ADMIN",
    action: "admin.user_role_update",
    outcome: "SUCCESS",
    actor: actor._id,
    actorEmail: actor.email,
    targetType: "User",
    targetId: String(user._id),
    req,
    metadata: {
      targetEmail: user.email,
      previousRole,
      newRole,
      ...(input.reason ? { reason: sanitizePlainText(input.reason) } : {}),
    },
  });

  if (user.preferences?.securityAlerts !== false) {
    void sendRoleChangeNotificationEmail(user.email, user.name, previousRole, newRole).catch(() => undefined);
  }

  return {
    user: serializeSafeUser(user),
    previousRole,
    newRole,
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
    },
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

// ── Admin Email Center & Campaign History ────────────────────────────────────

export function previewAdminEmail(input: PreviewAdminEmailInput): {
  subject: string;
  html: string;
  text: string;
  sanitizedBodyHtml: string;
} {
  const cleanSubject = sanitizePlainText(input.subject);
  const sanitizedBodyHtml = sanitizeRichHtml(input.bodyHtml);
  const { html, text } = renderCustomAdminEmail(cleanSubject, sanitizedBodyHtml, "Valued Member");
  return {
    subject: cleanSubject,
    html,
    text,
    sanitizedBodyHtml,
  };
}

export async function sendAdminEmailCampaign(input: SendAdminEmailInput, req: Request) {
  const actor = req.user!;
  const cleanSubject = sanitizePlainText(input.subject);
  const sanitizedBodyHtml = sanitizeRichHtml(input.bodyHtml);
  const plainBodyText = htmlToPlainText(sanitizedBodyHtml);

  if (!cleanSubject || cleanSubject.length < 2) {
    throw AppError.badRequest("Please provide a valid email subject");
  }
  if (!plainBodyText || plainBodyText.length < 2) {
    throw AppError.badRequest("Please provide meaningful email content");
  }

  // Prevent accidental duplicate bulk sends within a 30-second window
  if (input.recipientMode !== "TEST") {
    const duplicateCutoff = new Date(Date.now() - 30_000);
    const recentDuplicate = await EmailCampaign.findOne({
      sender: actor._id,
      subject: cleanSubject,
      recipientMode: input.recipientMode,
      createdAt: trusted({ $gte: duplicateCutoff }),
    }).lean();

    if (recentDuplicate) {
      throw new AppError(
        409,
        "DUPLICATE_CAMPAIGN",
        "An identical email campaign was already dispatched in the last 30 seconds.",
      );
    }
  }

  let resolvedRecipients: { userId?: IUser["_id"]; email: string; name: string }[] = [];

  if (input.recipientMode === "TEST") {
    const targetEmail = (input.testEmail || actor.email).trim().toLowerCase();
    resolvedRecipients = [
      {
        userId: actor._id,
        email: targetEmail,
        name: actor.name || "Administrator",
      },
    ];
  } else if (input.recipientMode === "SINGLE") {
    const targetId = input.recipientIds?.[0];
    if (!targetId) {
      throw AppError.badRequest("Please select a recipient user");
    }
    const targetUser = await User.findById(toObjectId(targetId)).lean<IUser>();
    if (!targetUser) {
      throw AppError.notFound("Selected recipient user was not found");
    }
    resolvedRecipients = [
      {
        userId: targetUser._id,
        email: targetUser.email,
        name: targetUser.name,
      },
    ];
  } else if (input.recipientMode === "SELECTED") {
    const uniqueIds = Array.from(new Set(input.recipientIds ?? [])).map((id) => toObjectId(id));
    const filter: Record<string, unknown> = {
      _id: trusted({ $in: uniqueIds }),
      status: trusted({ $ne: "SUSPENDED" }),
    };
    if (input.respectMarketingConsent !== false) {
      filter["preferences.emailNotifications"] = trusted({ $ne: false });
    }
    const users = await User.find(filter).select("_id name email").lean<IUser[]>();
    resolvedRecipients = users.map((u) => ({
      userId: u._id,
      email: u.email,
      name: u.name,
    }));
  } else if (input.recipientMode === "ALL") {
    const filter: Record<string, unknown> = {
      emailVerified: true,
      status: "ACTIVE",
    };
    if (input.respectMarketingConsent !== false) {
      filter["preferences.emailNotifications"] = trusted({ $ne: false });
    }
    const users = await User.find(filter).select("_id name email").limit(2000).lean<IUser[]>();
    resolvedRecipients = users.map((u) => ({
      userId: u._id,
      email: u.email,
      name: u.name,
    }));
  }

  if (resolvedRecipients.length === 0) {
    throw AppError.badRequest("No eligible recipients matched your selection criteria");
  }

  const initialRecipientDocs: ICampaignRecipient[] = resolvedRecipients.map((r) => ({
    ...(r.userId ? { userId: r.userId } : {}),
    email: r.email,
    name: r.name,
    status: "PENDING",
  }));

  const campaign = await EmailCampaign.create({
    subject: cleanSubject,
    bodyHtml: sanitizedBodyHtml,
    bodyText: plainBodyText,
    recipientMode: input.recipientMode,
    recipientCount: initialRecipientDocs.length,
    sentCount: 0,
    failedCount: 0,
    pendingCount: initialRecipientDocs.length,
    status: "PROCESSING",
    sender: actor._id,
    senderEmail: actor.email,
    senderName: actor.name,
    respectMarketingConsent: input.respectMarketingConsent !== false,
    recipients: initialRecipientDocs,
  });

  // Deliver individually in controlled batches of 10 so recipients never see each other's email addresses
  let sentCount = 0;
  let failedCount = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < campaign.recipients.length; i += BATCH_SIZE) {
    const slice = campaign.recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      slice.map(async (recipientEntry) => {
        try {
          const { html, text } = renderCustomAdminEmail(
            cleanSubject,
            sanitizedBodyHtml,
            recipientEntry.name,
          );
          await deliverCampaignEmail({
            to: recipientEntry.email,
            subject: cleanSubject,
            html,
            text,
          });
          recipientEntry.status = "SENT";
          recipientEntry.sentAt = new Date();
          sentCount += 1;
        } catch (err) {
          recipientEntry.status = "FAILED";
          recipientEntry.error =
            err instanceof Error ? err.message.slice(0, 300) : "Delivery failed";
          failedCount += 1;
        }
      }),
    );
  }

  campaign.sentCount = sentCount;
  campaign.failedCount = failedCount;
  campaign.pendingCount = 0;
  campaign.completedAt = new Date();
  campaign.status =
    failedCount === 0 ? "COMPLETED" : sentCount > 0 ? "PARTIAL" : "FAILED";
  await campaign.save();

  await recordAudit({
    category: "ADMIN",
    action: "admin.email_campaign_send",
    outcome: failedCount === 0 ? "SUCCESS" : "FAILURE",
    actor: actor._id,
    actorEmail: actor.email,
    targetType: "EmailCampaign",
    targetId: String(campaign._id),
    req,
    metadata: {
      subject: cleanSubject,
      recipientMode: input.recipientMode,
      recipientCount: campaign.recipientCount,
      sentCount,
      failedCount,
      status: campaign.status,
    },
  });

  const json = campaign.toJSON() as unknown as Record<string, unknown>;
  return {
    campaign: {
      ...json,
      _id: String(campaign._id),
      id: String(campaign._id),
    },
  };
}

export async function listEmailCampaigns(query: ListEmailCampaignsQuery): Promise<{
  campaigns: Record<string, unknown>[];
  meta: PaginationMeta;
}> {
  const { page, limit } = normalizePage(query.page, query.limit, 100);
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }
  if (query.recipientMode) {
    filter.recipientMode = query.recipientMode;
  }
  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { subject: trusted({ $regex: safePattern }) },
      { senderEmail: trusted({ $regex: safePattern }) },
      { senderName: trusted({ $regex: safePattern }) },
    ]);
  }

  const [total, docs] = await Promise.all([
    EmailCampaign.countDocuments(filter),
    EmailCampaign.find(filter)
      .select("-recipients")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "name email role"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    campaigns: docs.map((d) => {
      const json = d.toJSON() as unknown as Record<string, unknown>;
      return { ...json, _id: String(d._id), id: String(d._id) };
    }),
    meta: { page, limit, total, totalPages },
  };
}

export async function getEmailCampaignDetails(id: string) {
  const campaign = await EmailCampaign.findById(toObjectId(id)).populate("sender", "name email role");
  if (!campaign) {
    throw AppError.notFound("Email campaign not found");
  }
  const json = campaign.toJSON() as unknown as Record<string, unknown>;
  return {
    campaign: {
      ...json,
      _id: String(campaign._id),
      id: String(campaign._id),
    },
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
