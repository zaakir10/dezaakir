import { Router } from "express";
import {
  bulkBlogActionHandler,
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
  BulkBlogActionSchema,
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

// Admin blog routes (includes drafts & scheduled posts): /api/admin/blogs
adminBlogRouter.use(requireAdmin);
adminBlogRouter.get("/", validate({ query: ListBlogsQuerySchema }), listAdminBlogsHandler);
adminBlogRouter.post("/bulk", validate({ body: BulkBlogActionSchema }), bulkBlogActionHandler);
adminBlogRouter.post("/", validate({ body: CreateBlogSchema }), createBlogHandler);
adminBlogRouter.get("/:id", validate({ params: BlogIdParamSchema }), getAdminBlogByIdHandler);
adminBlogRouter.put("/:id", validate({ params: BlogIdParamSchema, body: UpdateBlogSchema }), updateBlogHandler);
adminBlogRouter.delete("/:id", validate({ params: BlogIdParamSchema }), deleteBlogHandler);
