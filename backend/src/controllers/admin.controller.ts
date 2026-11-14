import type { Request, Response } from "express";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  getAdminOverview,
  listAdminUsers,
  getAdminUserDetails,
  updateAdminUserStatus,
  updateAdminUserRole,
  revokeUserSessionsByAdmin,
  previewAdminEmail,
  sendAdminEmailCampaign,
  listEmailCampaigns,
  cleanupEmailHistory,
  getEmailCampaignDetails,
  listAuditLogs,
  exportAuditLogs,
  cleanupAuditLogs,
  getSuspiciousActivitySummary,
  getDataRetentionOverview,
  updateDataRetentionSettings,
  runDataRetentionCleanup,
  listSuppressedEmails,
  removeSuppressedEmail,
  type ListUsersQuery,
  type UpdateUserStatusInput,
  type UpdateUserRoleInput,
  type PreviewAdminEmailInput,
  type SendAdminEmailInput,
  type ListEmailCampaignsQuery,
  type ListAuditLogsQuery,
} from "../services/admin.service.js";
import {
  listModerationHistory,
  reinstateUserAccount,
  suspendUserAccount,
} from "../services/moderation.service.js";
import { checkEmailDeliverability, sendDeliverabilityTestEmail } from "../services/email.service.js";

export async function getAdminOverviewHandler(_req: Request, res: Response): Promise<void> {
  const overview = await getAdminOverview();
  sendSuccess(res, overview, 200);
}

export async function listAdminUsersHandler(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? req.query) as unknown as ListUsersQuery;
  const result = await listAdminUsers(query);
  sendSuccess(res, { users: result.users, summary: result.summary }, 200, result.meta);
}

export async function getAdminUserDetailsHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const details = await getAdminUserDetails(id);
  sendSuccess(res, details, 200);
}

export async function updateAdminUserStatusHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const body = req.body as UpdateUserStatusInput;
  const result = await updateAdminUserStatus(id, body, req);
  sendSuccess(res, result, 200);
}

export async function updateAdminUserRoleHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const body = req.body as UpdateUserRoleInput;
  const result = await updateAdminUserRole(id, body, req);
  sendSuccess(res, result, 200);
}

export async function revokeAdminUserSessionsHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const result = await revokeUserSessionsByAdmin(id, req);
  sendSuccess(res, result, 200);
}

export function previewAdminEmailHandler(req: Request, res: Response): void {
  const body = req.body as PreviewAdminEmailInput;
  const result = previewAdminEmail(body);
  sendSuccess(res, result, 200);
}

export async function sendAdminEmailHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as SendAdminEmailInput;
  const result = await sendAdminEmailCampaign(body, req);
  sendSuccess(res, result, 201);
}

export async function listEmailCampaignsHandler(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? req.query) as unknown as ListEmailCampaignsQuery;
  const result = await listEmailCampaigns(query);
  sendSuccess(
    res,
    {
      campaigns: result.campaigns,
      totalStoredRecords: result.totalStoredRecords,
      retentionDays: result.retentionDays,
    },
    200,
    result.meta,
  );
}

export async function cleanupEmailHistoryHandler(req: Request, res: Response): Promise<void> {
  const { scope } = req.body as { scope: "TODAY" | "ALL" };
  const result = await cleanupEmailHistory(scope, req);
  sendSuccess(res, result, 200);
}

export async function getEmailCampaignDetailsHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const result = await getEmailCampaignDetails(id);
  sendSuccess(res, result, 200);
}

export async function listAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? req.query) as unknown as ListAuditLogsQuery;
  const result = await listAuditLogs(query);
  sendSuccess(
    res,
    {
      logs: result.logs,
      totalStoredRecords: result.totalStoredRecords,
      suspiciousCount: result.suspiciousCount,
    },
    200,
    result.meta,
  );
}

export async function exportAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? req.query) as unknown as ListAuditLogsQuery;
  const result = await exportAuditLogs(query);
  sendSuccess(res, result, 200);
}

export async function cleanupAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as { scope: "TODAY" | "ALL"; preserveCritical?: boolean };
  const result = await cleanupAuditLogs(body, req);
  sendSuccess(res, result, 200);
}

export async function getSuspiciousActivityHandler(_req: Request, res: Response): Promise<void> {
  const result = await getSuspiciousActivitySummary();
  sendSuccess(res, result, 200);
}

export async function suspendUserHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    duration: "1H" | "24H" | "7D" | "30D" | "PERMANENT";
    reason: string;
    notes?: string;
  };
  const user = await suspendUserAccount(String(req.params.id), body, req);
  sendSuccess(res, { user }, 200);
}

export async function reinstateUserHandler(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { reason?: string; notes?: string };
  const user = await reinstateUserAccount(String(req.params.id), body, req);
  sendSuccess(res, { user }, 200);
}

export async function listModerationHistoryHandler(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? req.query) as {
    page?: number;
    limit?: number;
    userId?: string;
    action?: "SUSPENDED" | "REINSTATED" | "AUTO_REINSTATED";
    search?: string;
  };
  const result = await listModerationHistory(query);
  sendSuccess(res, { logs: result.logs }, 200, result.meta);
}

export async function getRetentionOverviewHandler(_req: Request, res: Response): Promise<void> {
  const result = await getDataRetentionOverview();
  sendSuccess(res, result, 200);
}

export async function updateRetentionSettingsHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    emailHistoryDays: number;
    auditLogDays: number;
    activityLogDays: number;
    autoCleanupEnabled: boolean;
  };
  const result = await updateDataRetentionSettings(body, req);
  sendSuccess(res, result, 200);
}

export async function runRetentionCleanupHandler(req: Request, res: Response): Promise<void> {
  const result = await runDataRetentionCleanup(req);
  sendSuccess(res, result, 200);
}

export async function getEmailDeliverabilityHandler(_req: Request, res: Response): Promise<void> {
  const report = await checkEmailDeliverability();
  sendSuccess(res, { report }, 200);
}

export async function testEmailDeliverabilityHandler(req: Request, res: Response): Promise<void> {
  const { to } = req.body as { to: string };
  const result = await sendDeliverabilityTestEmail(to, req.user?.name ?? "Administrator");
  sendSuccess(res, result, 200);
}

export async function listSuppressionsHandler(_req: Request, res: Response): Promise<void> {
  const result = await listSuppressedEmails();
  sendSuccess(res, result, 200);
}

export async function removeSuppressionHandler(req: Request, res: Response): Promise<void> {
  const result = await removeSuppressedEmail(String(req.params.id), req);
  sendSuccess(res, result, 200);
}
