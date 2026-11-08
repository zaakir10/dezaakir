import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserStatusSchema,
  listAuditLogsQuerySchema,
} from "../validators/admin.validator.js";
import {
  getAdminOverviewHandler,
  listAdminUsersHandler,
  getAdminUserDetailsHandler,
  updateAdminUserStatusHandler,
  revokeAdminUserSessionsHandler,
  listAuditLogsHandler,
} from "../controllers/admin.controller.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/overview", getAdminOverviewHandler);

adminRouter.get(
  "/users",
  validate({ query: listUsersQuerySchema }),
  listAdminUsersHandler
);

adminRouter.get(
  "/users/:id",
  validate({ params: userIdParamSchema }),
  getAdminUserDetailsHandler
);

adminRouter.patch(
  "/users/:id/status",
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  updateAdminUserStatusHandler
);

adminRouter.delete(
  "/users/:id/sessions",
  validate({ params: userIdParamSchema }),
  revokeAdminUserSessionsHandler
);

adminRouter.get(
  "/audit-logs",
  validate({ query: listAuditLogsQuerySchema }),
  listAuditLogsHandler
);
