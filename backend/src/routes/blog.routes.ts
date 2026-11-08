import { Router } from "express";
import {
  createBlogHandler,
  deleteBlogHandler,
  getAdminBlogByIdHandler,
  getPublicBlogBySlugHandler,
  listAdminBlogsHandler,
  listPublicBlogsHandler,
  updateBlogHandler,
} from "../controllers/blog.controller.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  BlogIdParamSchema,
  BlogSlugParamSchema,
  CreateBlogSchema,
  ListBlogsQuerySchema,
  UpdateBlogSchema,
} from "../validators/blog.validator.js";

export const blogRouter = Router();
export const adminBlogRouter = Router();

// Public blog routes: GET /api/blogs, GET /api/blogs/:slug
blogRouter.get("/", validate({ query: ListBlogsQuerySchema }), listPublicBlogsHandler);
blogRouter.get("/:slug", validate({ params: BlogSlugParamSchema }), getPublicBlogBySlugHandler);

// Admin blog write routes required by Section 10: POST /api/blogs, PUT /api/blogs/:id, DELETE /api/blogs/:id
blogRouter.post("/", requireAdmin, validate({ body: CreateBlogSchema }), createBlogHandler);
blogRouter.put("/:id", requireAdmin, validate({ params: BlogIdParamSchema, body: UpdateBlogSchema }), updateBlogHandler);
blogRouter.delete("/:id", requireAdmin, validate({ params: BlogIdParamSchema }), deleteBlogHandler);

// Admin blog read routes (includes drafts & scheduled posts): GET /api/admin/blogs, GET /api/admin/blogs/:id
adminBlogRouter.use(requireAdmin);
adminBlogRouter.get("/", validate({ query: ListBlogsQuerySchema }), listAdminBlogsHandler);
adminBlogRouter.get("/:id", validate({ params: BlogIdParamSchema }), getAdminBlogByIdHandler);
