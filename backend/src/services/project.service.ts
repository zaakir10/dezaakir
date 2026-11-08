import type { Request } from "express";
import mongoose from "mongoose";
import { Project, type IProject } from "../models/Project.js";
import { Category } from "../models/Category.js";
import { AppError } from "../utils/AppError.js";
import { escapeRegex, isObjectId, trusted } from "../utils/query.js";
import { slugify } from "../utils/text.js";
import { sanitizeRichHtml } from "../utils/sanitizeHtml.js";
import { recordAudit } from "./audit.service.js";
import type { z } from "zod";
import type {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
} from "../validators/project.validator.js";

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

async function resolveUniqueProjectSlug(baseText: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(baseText, 100) || `project-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId && isObjectId(excludeId)) {
      query._id = trusted({ $ne: new mongoose.Types.ObjectId(excludeId) });
    }
    const existing = await Project.findOne(query).select("_id").lean();
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

async function resolveCategoryFilter(categoryParam: string): Promise<mongoose.Types.ObjectId | null> {
  if (isObjectId(categoryParam)) {
    return new mongoose.Types.ObjectId(categoryParam);
  }
  const cat = await Category.findOne({ slug: categoryParam.toLowerCase() }).select("_id").lean();
  return cat ? (cat._id as mongoose.Types.ObjectId) : null;
}

export async function listPublicProjects(query: ListProjectsQuery) {
  const filter: Record<string, unknown> = {
    ...Project.publicFilter(),
  };

  if (query.featured !== undefined) {
    filter.featured = query.featured;
  }

  if (query.technology) {
    filter.technologies = query.technology;
  }

  if (query.category) {
    const categoryId = await resolveCategoryFilter(query.category);
    if (!categoryId) {
      return {
        projects: [],
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 0,
      };
    }
    filter.category = categoryId;
  }

  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { title: safePattern },
      { summary: safePattern },
      { technologies: safePattern },
    ]);
  }

  const skip = (query.page - 1) * query.limit;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("category", "name slug")
      .sort({ featured: -1, order: 1, publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  return {
    projects: projects.map((p) => ({ ...p, id: String(p._id) })),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getPublicProjectBySlug(slug: string) {
  const project = await Project.findOne({
    slug: slug.toLowerCase(),
    ...Project.publicFilter(),
  })
    .populate("category", "name slug")
    .lean();

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  return { ...project, id: String(project._id) };
}

export async function listAdminProjects(query: ListProjectsQuery) {
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.featured !== undefined) {
    filter.featured = query.featured;
  }

  if (query.category) {
    const categoryId = await resolveCategoryFilter(query.category);
    if (categoryId) {
      filter.category = categoryId;
    }
  }

  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { title: safePattern },
      { slug: safePattern },
      { summary: safePattern },
      { technologies: safePattern },
    ]);
  }

  const skip = (query.page - 1) * query.limit;

  let sortOrder: Record<string, 1 | -1> = { order: 1, createdAt: -1 };
  if (query.sort === "oldest") {
    sortOrder = { createdAt: 1 };
  } else if (query.sort === "title") {
    sortOrder = { title: 1 };
  } else if (query.sort === "newest") {
    sortOrder = { createdAt: -1 };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("category", "name slug")
      .sort(sortOrder)
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  return {
    projects: projects.map((p) => ({ ...p, id: String(p._id) })),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getAdminProjectById(id: string) {
  const project = await Project.findById(id).populate("category", "name slug").lean();
  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }
  return { ...project, id: String(project._id) };
}

export async function createProject(
  input: CreateProjectInput,
  actorId: string,
  req?: Request
): Promise<IProject> {
  const slug = input.slug
    ? await resolveUniqueProjectSlug(input.slug)
    : await resolveUniqueProjectSlug(input.title);

  if (input.category) {
    const catExists = await Category.findById(input.category).select("_id").lean();
    if (!catExists) {
      throw new AppError(400, "INVALID_CATEGORY", "Selected category does not exist");
    }
  }

  const sanitizedDescription = sanitizeRichHtml(input.description);

  const projectDoc = await Project.create({
    title: input.title,
    slug,
    summary: input.summary,
    description: sanitizedDescription,
    coverImage: input.coverImage ?? undefined,
    images: input.images ?? [],
    technologies: input.technologies ?? [],
    githubUrl: input.githubUrl,
    liveUrl: input.liveUrl,
    category: input.category ? new mongoose.Types.ObjectId(input.category) : undefined,
    featured: input.featured ?? false,
    status: input.status ?? "DRAFT",
    order: input.order ?? 0,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    publishedAt:
      input.status === "PUBLISHED" ? (input.publishedAt ?? new Date()) : input.publishedAt,
  });

  await recordAudit({
    category: "ADMIN",
    action: "admin.project_create",
    outcome: "SUCCESS",
    actor: actorId,
    actorEmail: req?.user?.email,
    targetType: "Project",
    targetId: String(projectDoc._id),
    req,
    metadata: {
      slug: projectDoc.slug,
      status: projectDoc.status,
      featured: projectDoc.featured,
    },
  });

  return projectDoc.toObject();
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  actorId: string,
  req?: Request
): Promise<IProject> {
  const existing = await Project.findById(id);
  if (!existing) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  if (input.slug && input.slug !== existing.slug) {
    existing.slug = await resolveUniqueProjectSlug(input.slug, id);
  } else if (input.title && !input.slug && existing.status === "DRAFT") {
    existing.slug = await resolveUniqueProjectSlug(input.title, id);
  }

  if (input.title !== undefined) existing.title = input.title;
  if (input.summary !== undefined) existing.summary = input.summary;
  if (input.description !== undefined) {
    existing.description = sanitizeRichHtml(input.description);
  }
  if (input.coverImage !== undefined) {
    existing.coverImage = input.coverImage ?? undefined;
  }
  if (input.images !== undefined) existing.images = input.images;
  if (input.technologies !== undefined) existing.technologies = input.technologies;
  if (input.githubUrl !== undefined) existing.githubUrl = input.githubUrl;
  if (input.liveUrl !== undefined) existing.liveUrl = input.liveUrl;
  if (input.category !== undefined) {
    if (input.category) {
      const catExists = await Category.findById(input.category).select("_id").lean();
      if (!catExists) {
        throw new AppError(400, "INVALID_CATEGORY", "Selected category does not exist");
      }
      existing.category = new mongoose.Types.ObjectId(input.category);
    } else {
      existing.category = undefined;
    }
  }
  if (input.featured !== undefined) existing.featured = input.featured;
  if (input.status !== undefined) {
    existing.status = input.status;
    if (input.status === "PUBLISHED" && !existing.publishedAt) {
      existing.publishedAt = new Date();
    }
  }
  if (input.order !== undefined) existing.order = input.order;
  if (input.seoTitle !== undefined) existing.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) existing.seoDescription = input.seoDescription;
  if (input.publishedAt !== undefined) existing.publishedAt = input.publishedAt;

  await existing.save();

  await recordAudit({
    category: "ADMIN",
    action: "admin.project_update",
    outcome: "SUCCESS",
    actor: actorId,
    actorEmail: req?.user?.email,
    targetType: "Project",
    targetId: String(existing._id),
    req,
    metadata: {
      slug: existing.slug,
      status: existing.status,
      featured: existing.featured,
    },
  });

  return existing.toObject();
}

export async function deleteProject(
  id: string,
  actorId: string,
  req?: Request
): Promise<{ deleted: true; id: string }> {
  const existing = await Project.findByIdAndDelete(id).lean();
  if (!existing) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  await recordAudit({
    category: "ADMIN",
    action: "admin.project_delete",
    outcome: "SUCCESS",
    actor: actorId,
    actorEmail: req?.user?.email,
    targetType: "Project",
    targetId: id,
    req,
    metadata: {
      slug: existing.slug,
      title: existing.title,
    },
  });

  return { deleted: true, id };
}
