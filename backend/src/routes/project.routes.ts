import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  projectSlugParamSchema,
  projectIdParamSchema,
} from "../validators/project.validator.js";
import {
  listPublicProjectsHandler,
  getPublicProjectBySlugHandler,
  listAdminProjectsHandler,
  getAdminProjectByIdHandler,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from "../controllers/project.controller.js";

export const projectRouter = Router();
export const adminProjectRouter = Router();

// Public + Section 10 canonical endpoints under /api/projects
projectRouter.get(
  "/",
  validate({ query: listProjectsQuerySchema }),
  listPublicProjectsHandler
);

projectRouter.get(
  "/:slug",
  validate({ params: projectSlugParamSchema }),
  getPublicProjectBySlugHandler
);

projectRouter.post(
  "/",
  requireAdmin,
  validate({ body: createProjectSchema }),
  createProjectHandler
);

projectRouter.put(
  "/:id",
  requireAdmin,
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  updateProjectHandler
);

projectRouter.delete(
  "/:id",
  requireAdmin,
  validate({ params: projectIdParamSchema }),
  deleteProjectHandler
);

// Admin dashboard endpoints under /api/admin/projects
adminProjectRouter.use(requireAdmin);

adminProjectRouter.get(
  "/",
  validate({ query: listProjectsQuerySchema }),
  listAdminProjectsHandler
);

adminProjectRouter.get(
  "/:id",
  validate({ params: projectIdParamSchema }),
  getAdminProjectByIdHandler
);

adminProjectRouter.post(
  "/",
  validate({ body: createProjectSchema }),
  createProjectHandler
);

adminProjectRouter.put(
  "/:id",
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  updateProjectHandler
);

adminProjectRouter.delete(
  "/:id",
  validate({ params: projectIdParamSchema }),
  deleteProjectHandler
);
