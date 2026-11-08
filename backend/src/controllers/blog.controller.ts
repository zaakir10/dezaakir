import type { RequestHandler } from "express";
import {
  bulkBlogAction,
  createBlogArticle,
  deleteBlogArticle,
  getAdminBlogById,
  getPublicBlogBySlug,
  listAdminBlogs,
  listPublicBlogs,
  updateBlogArticle,
} from "../services/blog.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import type {
  BulkBlogActionInput,
  CreateBlogInput,
  ListBlogsQuery,
  UpdateBlogInput,
} from "../validators/blog.validator.js";

export const listPublicBlogsHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  const query = (req.validatedQuery ?? {}) as ListBlogsQuery;
  const { blogs, categories, tags, meta } = await listPublicBlogs(query);
  sendSuccess(res, { blogs, categories, tags }, 200, meta);
};

export const getPublicBlogBySlugHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  const slug = String(req.params.slug);
  const result = await getPublicBlogBySlug(slug);
  sendSuccess(res, result);
};

export const listAdminBlogsHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const query = (req.validatedQuery ?? {}) as ListBlogsQuery;
  const { blogs, meta } = await listAdminBlogs(query);
  sendSuccess(res, { blogs }, 200, meta);
};

export const getAdminBlogByIdHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const blog = await getAdminBlogById(String(req.params.id));
  sendSuccess(res, { blog });
};

export const createBlogHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const blog = await createBlogArticle(req.body as CreateBlogInput, String(req.user!._id), req);
  sendSuccess(res, { blog }, 201);
};

export const updateBlogHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const blog = await updateBlogArticle(String(req.params.id), req.body as UpdateBlogInput, req);
  sendSuccess(res, { blog });
};

export const deleteBlogHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await deleteBlogArticle(String(req.params.id), req);
  sendSuccess(res, { message: "Article deleted successfully" });
};

export const bulkBlogActionHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const result = await bulkBlogAction(req.body as BulkBlogActionInput, req);
  sendSuccess(res, result);
};
