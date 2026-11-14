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
  getEmailCampaignDetails,
  listAuditLogs,
  type ListUsersQuery,
  type UpdateUserStatusInput,
  type UpdateUserRoleInput,
  type PreviewAdminEmailInput,
  type SendAdminEmailInput,
  type ListEmailCampaignsQuery,
  type ListAuditLogsQuery,
} from "../services/admin.service.js";

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
  sendSuccess(res, { campaigns: result.campaigns }, 200, result.meta);
}

export async function getEmailCampaignDetailsHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const result = await getEmailCampaignDetails(id);
  sendSuccess(res, result, 200);
}

export async function listAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? req.query) as unknown as ListAuditLogsQuery;
  const result = await listAuditLogs(query);
  sendSuccess(res, { logs: result.logs }, 200, result.meta);
}
