import { z } from "zod";
import { sanitizePlainText, sanitizeRichHtml } from "../utils/sanitizeHtml.js";
import { SLUG_PATTERN } from "../utils/text.js";

const imageRefSchema = z
  .object({
    url: z.string().url().regex(/^https:\/\//i, "Image URL must use HTTPS").max(2048),
    publicId: z.string().trim().min(1).max(255),
    alt: z
      .string()
      .trim()
      .max(200)
      .transform((v) => sanitizePlainText(v))
      .optional()
      .default(""),
    width: z.coerce.number().int().min(1).max(10000).optional(),
    height: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .strict();

const baseProjectFields = {
  title: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform((v) => sanitizePlainText(v)),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(SLUG_PATTERN, "Slug must be lowercase kebab-case")
    .optional(),
  summary: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .transform((v) => sanitizePlainText(v)),
  description: z
    .string()
    .min(1)
    .max(200_000)
    .transform((v) => sanitizeRichHtml(v)),
  coverImage: imageRefSchema.optional().nullable(),
  images: z.array(imageRefSchema).max(20).optional(),
  technologies: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(40)
        .transform((v) => sanitizePlainText(v))
    )
    .max(30)
    .optional(),
  githubUrl: z
    .union([
      z
        .string()
        .trim()
        .max(2048)
        .regex(/^https:\/\/(www\.)?github\.com\/[^\s<>"']+$/i, "Must be an HTTPS GitHub URL"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v ? v : undefined)),
  liveUrl: z
    .union([
      z
        .string()
        .trim()
        .url()
        .max(2048)
        .regex(/^https:\/\//i, "Live URL must use HTTPS"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v ? v : undefined)),
  category: z
    .union([
      z.string().regex(/^[a-f\d]{24}$/i, "Invalid category ID"),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((v) => (v ? v : undefined)),
  featured: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  order: z.coerce.number().int().min(-10000).max(10000).optional(),
  seoTitle: z
    .string()
    .trim()
    .max(70)
    .transform((v) => sanitizePlainText(v))
    .optional(),
  seoDescription: z
    .string()
    .trim()
    .max(170)
    .transform((v) => sanitizePlainText(v))
    .optional(),
  publishedAt: z.coerce.date().optional(),
};

export const createProjectSchema = z
  .object({
    ...baseProjectFields,
    images: baseProjectFields.images.default([]),
    technologies: baseProjectFields.technologies.default([]),
    featured: baseProjectFields.featured.default(false),
    status: baseProjectFields.status.default("DRAFT"),
    order: baseProjectFields.order.default(0),
  })
  .strict();

export const updateProjectSchema = z
  .object(baseProjectFields)
  .partial()
  .strict();

export const listProjectsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(12),
    category: z.string().trim().max(80).optional(),
    technology: z.string().trim().max(40).optional(),
    featured: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    search: z.string().trim().max(100).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  })
  .strict();

export const projectSlugParamSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(120)
      .regex(SLUG_PATTERN, "Invalid project slug"),
  })
  .strict();

export const projectIdParamSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project ID"),
  })
  .strict();
