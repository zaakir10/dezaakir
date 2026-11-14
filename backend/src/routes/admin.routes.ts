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
  campaignIdParamSchema,
  listAuditLogsQuerySchema,
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
  getEmailCampaignDetailsHandler,
  listAuditLogsHandler,
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
