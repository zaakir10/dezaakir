import type { Request, Response } from "express";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  listPublicProjects,
  getPublicProjectBySlug,
  listAdminProjects,
  getAdminProjectById,
  createProject,
  updateProject,
  deleteProject,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ListProjectsQuery,
} from "../services/project.service.js";

export async function listPublicProjectsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListProjectsQuery;
  const result = await listPublicProjects(query);
  sendSuccess(res, { projects: result.projects }, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
}

export async function getPublicProjectBySlugHandler(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug);
  const project = await getPublicProjectBySlug(slug);
  sendSuccess(res, { project }, 200);
}

export async function listAdminProjectsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListProjectsQuery;
  const result = await listAdminProjects(query);
  sendSuccess(res, { projects: result.projects }, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
}

export async function getAdminProjectByIdHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const project = await getAdminProjectById(id);
  sendSuccess(res, { project }, 200);
}

export async function createProjectHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateProjectInput;
  const project = await createProject(body, String(req.user!._id), req);
  sendSuccess(res, { project }, 201);
}

export async function updateProjectHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const body = req.body as UpdateProjectInput;
  const project = await updateProject(id, body, String(req.user!._id), req);
  sendSuccess(res, { project }, 200);
}

export async function deleteProjectHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const result = await deleteProject(id, String(req.user!._id), req);
  sendSuccess(res, result, 200);
}
