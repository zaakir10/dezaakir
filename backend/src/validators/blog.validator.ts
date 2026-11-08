import { z } from "zod";
import { BLOG_STATUSES } from "../models/index.js";
import { SLUG_PATTERN } from "../utils/text.js";
import { cloudinaryImageSchema } from "./settings.validator.js";

const objectIdStr = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const ListBlogsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(60).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(BLOG_STATUSES).optional(),
});

export const BlogSlugParamSchema = z.strictObject({
  slug: z.string().trim().toLowerCase().min(1).max(120).regex(SLUG_PATTERN, "Invalid blog slug"),
});

export const BlogIdParamSchema = z.strictObject({
  id: objectIdStr,
});

export const CreateBlogSchema = z.strictObject({
  title: z.string().trim().min(1, "Title is required").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(SLUG_PATTERN, "Slug must contain lowercase letters, numbers, and hyphens only")
    .optional(),
  excerpt: z.string().trim().max(400).optional().default(""),
  content: z.string().trim().min(1, "Article content is required").max(500_000),
  coverImage: cloudinaryImageSchema.nullish(),
  category: objectIdStr.nullish(),
  tags: z.array(objectIdStr).max(15).default([]),
  status: z.enum(BLOG_STATUSES).default("DRAFT"),
  featured: z.boolean().default(false),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  publishedAt: z.coerce.date().optional(),
});

export const UpdateBlogSchema = z.strictObject({
  title: z.string().trim().min(1).max(160).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(SLUG_PATTERN, "Slug must contain lowercase letters, numbers, and hyphens only")
    .optional(),
  excerpt: z.string().trim().min(1).max(400).optional(),
  content: z.string().trim().min(1).max(500_000).optional(),
  coverImage: cloudinaryImageSchema.nullish(),
  category: objectIdStr.nullish(),
  tags: z.array(objectIdStr).max(15).optional(),
  status: z.enum(BLOG_STATUSES).optional(),
  featured: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).nullish(),
  seoDescription: z.string().trim().max(170).nullish(),
  publishedAt: z.coerce.date().nullish(),
});

export type ListBlogsQuery = z.infer<typeof ListBlogsQuerySchema>;
export type CreateBlogInput = z.infer<typeof CreateBlogSchema>;
export type UpdateBlogInput = z.infer<typeof UpdateBlogSchema>;
