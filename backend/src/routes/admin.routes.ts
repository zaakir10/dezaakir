import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  previewAdminEmailSchema,
  sendAdminEmailSchema,
  listEmailCampaignsQuerySchema,
  cleanupEmailHistorySchema,
  campaignIdParamSchema,
  listAuditLogsQuerySchema,
  cleanupAuditLogsSchema,
  suspendUserSchema,
  reinstateUserSchema,
  listModerationHistoryQuerySchema,
  updateRetentionSettingsSchema,
  testEmailDeliverabilitySchema,
  suppressionIdParamSchema,
} from "../validators/admin.validator.js";
import {
  getAdminOverviewHandler,
  listAdminUsersHandler,
  getAdminUserDetailsHandler,
  updateAdminUserStatusHandler,
  updateAdminUserRoleHandler,
  revokeAdminUserSessionsHandler,
  previewAdminEmailHandler,
  sendAdminEmailHandler,
  listEmailCampaignsHandler,
  cleanupEmailHistoryHandler,
  getEmailCampaignDetailsHandler,
  listAuditLogsHandler,
  exportAuditLogsHandler,
  cleanupAuditLogsHandler,
  getSuspiciousActivityHandler,
  suspendUserHandler,
  reinstateUserHandler,
  listModerationHistoryHandler,
  getRetentionOverviewHandler,
  updateRetentionSettingsHandler,
  runRetentionCleanupHandler,
  getEmailDeliverabilityHandler,
  testEmailDeliverabilityHandler,
  listSuppressionsHandler,
  removeSuppressionHandler,
} from "../controllers/admin.controller.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/overview", getAdminOverviewHandler);

adminRouter.get(
  "/users",
  validate({ query: listUsersQuerySchema }),
  listAdminUsersHandler,
);

adminRouter.get(
  "/users/:id",
  validate({ params: userIdParamSchema }),
  getAdminUserDetailsHandler,
);

adminRouter.patch(
  "/users/:id/status",
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  updateAdminUserStatusHandler,
);

adminRouter.patch(
  "/users/:id/role",
  validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
  updateAdminUserRoleHandler,
);

adminRouter.post(
  "/users/:id/suspend",
  validate({ params: userIdParamSchema, body: suspendUserSchema }),
  suspendUserHandler,
);

adminRouter.post(
  "/users/:id/reinstate",
  validate({ params: userIdParamSchema, body: reinstateUserSchema }),
  reinstateUserHandler,
);

adminRouter.get(
  "/moderation-history",
  validate({ query: listModerationHistoryQuerySchema }),
  listModerationHistoryHandler,
);

adminRouter.delete(
  "/users/:id/sessions",
  validate({ params: userIdParamSchema }),
  revokeAdminUserSessionsHandler,
);

// Admin Email Center & Campaign History
adminRouter.post(
  "/emails/preview",
  validate({ body: previewAdminEmailSchema }),
  previewAdminEmailHandler,
);

adminRouter.post(
  "/emails/send",
  validate({ body: sendAdminEmailSchema }),
  sendAdminEmailHandler,
);

adminRouter.get(
  "/emails/history",
  validate({ query: listEmailCampaignsQuerySchema }),
  listEmailCampaignsHandler,
);

adminRouter.post(
  "/emails/history/cleanup",
  validate({ body: cleanupEmailHistorySchema }),
  cleanupEmailHistoryHandler,
);

adminRouter.get(
  "/emails/history/:id",
  validate({ params: campaignIdParamSchema }),
  getEmailCampaignDetailsHandler,
);

adminRouter.get(
  "/audit-logs",
  validate({ query: listAuditLogsQuerySchema }),
  listAuditLogsHandler,
);

adminRouter.get(
  "/audit-logs/export",
  validate({ query: listAuditLogsQuerySchema }),
  exportAuditLogsHandler,
);

adminRouter.post(
  "/audit-logs/cleanup",
  validate({ body: cleanupAuditLogsSchema }),
  cleanupAuditLogsHandler,
);

adminRouter.get("/suspicious-activity", getSuspiciousActivityHandler);

adminRouter.get("/retention", getRetentionOverviewHandler);
adminRouter.put(
  "/retention",
  validate({ body: updateRetentionSettingsSchema }),
  updateRetentionSettingsHandler,
);
adminRouter.post("/retention/run", runRetentionCleanupHandler);

adminRouter.get("/email-deliverability", getEmailDeliverabilityHandler);
adminRouter.post(
  "/email-deliverability/test",
  validate({ body: testEmailDeliverabilitySchema }),
  testEmailDeliverabilityHandler,
);
adminRouter.get("/email-deliverability/suppressions", listSuppressionsHandler);
adminRouter.delete(
  "/email-deliverability/suppressions/:id",
  validate({ params: suppressionIdParamSchema }),
  removeSuppressionHandler,
);
