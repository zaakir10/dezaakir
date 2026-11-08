import type { RequestHandler } from "express";
import { Blog, Category, Project, Tag } from "../models/index.js";
import { recordAudit } from "../services/audit.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { toObjectId } from "../utils/query.js";
import { sanitizePlainText } from "../utils/sanitizeHtml.js";
import { slugify } from "../utils/text.js";
import type { CreateCategoryInput, CreateTagInput } from "../validators/taxonomy.validator.js";

export const listCategoriesHandler: RequestHandler = async (req, res) => {
  const query = (req.validatedQuery ?? {}) as { type?: "BLOG" | "PROJECT" };
  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;
  const categories = await Category.find(filter).sort({ name: 1 });
  sendSuccess(res, { categories });
};

export const createCategoryHandler: RequestHandler = async (req, res) => {
  const body = req.body as CreateCategoryInput;
  const name = sanitizePlainText(body.name);
  const slug = body.slug || slugify(body.name, 80);
  if (!slug) throw AppError.badRequest("Unable to generate a valid slug from category name");

  try {
    const category = await Category.create({
      name,
      slug,
      type: body.type,
      ...(body.description ? { description: sanitizePlainText(body.description) } : {}),
    });

    await recordAudit({
      category: "ADMIN",
      action: "admin.category_create",
      outcome: "SUCCESS",
      actor: req.user!._id,
      actorEmail: req.user!.email,
      targetType: "Category",
      targetId: String(category._id),
      req,
      metadata: { slug, type: body.type },
    });

    sendSuccess(res, { category }, 201);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: number }).code === 11000) {
      throw AppError.conflict("A category with this slug already exists for this type");
    }
    throw err;
  }
};

export const deleteCategoryHandler: RequestHandler = async (req, res) => {
  const id = toObjectId(String(req.params.id));
  const category = await Category.findByIdAndDelete(id);
  if (!category) throw AppError.notFound("Category not found");

  // Unset category reference on affected blogs/projects
  await Promise.all([
    Blog.updateMany({ category: id }, { $unset: { category: 1 } }),
    Project.updateMany({ category: id }, { $unset: { category: 1 } }),
  ]);

  await recordAudit({
    category: "ADMIN",
    action: "admin.category_delete",
    outcome: "SUCCESS",
    actor: req.user!._id,
    actorEmail: req.user!.email,
    targetType: "Category",
    targetId: String(id),
    req,
  });

  sendSuccess(res, { message: "Category deleted" });
};

export const listTagsHandler: RequestHandler = async (_req, res) => {
  const tags = await Tag.find({}).sort({ name: 1 });
  sendSuccess(res, { tags });
};

export const createTagHandler: RequestHandler = async (req, res) => {
  const body = req.body as CreateTagInput;
  const name = sanitizePlainText(body.name);
  const slug = body.slug || slugify(body.name, 60);
  if (!slug) throw AppError.badRequest("Unable to generate a valid slug from tag name");

  try {
    const tag = await Tag.create({ name, slug });

    await recordAudit({
      category: "ADMIN",
      action: "admin.tag_create",
      outcome: "SUCCESS",
      actor: req.user!._id,
      actorEmail: req.user!.email,
      targetType: "Tag",
      targetId: String(tag._id),
      req,
      metadata: { slug },
    });

    sendSuccess(res, { tag }, 201);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: number }).code === 11000) {
      throw AppError.conflict("A tag with this slug already exists");
    }
    throw err;
  }
};

export const deleteTagHandler: RequestHandler = async (req, res) => {
  const id = toObjectId(String(req.params.id));
  const tag = await Tag.findByIdAndDelete(id);
  if (!tag) throw AppError.notFound("Tag not found");

  await Blog.updateMany({ tags: id }, { $pull: { tags: id } });

  await recordAudit({
    category: "ADMIN",
    action: "admin.tag_delete",
    outcome: "SUCCESS",
    actor: req.user!._id,
    actorEmail: req.user!.email,
    targetType: "Tag",
    targetId: String(id),
    req,
  });

  sendSuccess(res, { message: "Tag deleted" });
};
