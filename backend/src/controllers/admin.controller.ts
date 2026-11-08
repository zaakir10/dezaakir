import type { Request, Response } from "express";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  getAdminOverview,
  listAdminUsers,
  getAdminUserDetails,
  updateAdminUserStatus,
  revokeUserSessionsByAdmin,
  listAuditLogs,
  type ListUsersQuery,
  type UpdateUserStatusInput,
  type ListAuditLogsQuery,
} from "../services/admin.service.js";

export async function getAdminOverviewHandler(_req: Request, res: Response): Promise<void> {
  const overview = await getAdminOverview();
  sendSuccess(res, overview, 200);
}

export async function listAdminUsersHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListUsersQuery;
  const result = await listAdminUsers(query);
  sendSuccess(res, { users: result.users }, 200, result.meta);
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

export async function revokeAdminUserSessionsHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const result = await revokeUserSessionsByAdmin(id, req);
  sendSuccess(res, result, 200);
}

export async function listAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListAuditLogsQuery;
  const result = await listAuditLogs(query);
  sendSuccess(res, { logs: result.logs }, 200, result.meta);
}
