import { z } from "zod";
import { sanitizePlainText } from "../utils/sanitizeHtml.js";

export const signUploadSchema = z
  .object({
    folder: z
      .enum(["dezaakir/blogs", "dezaakir/projects", "dezaakir/profile", "dezaakir/general"])
      .optional()
      .default("dezaakir/general"),
  })
  .strict();

export const uploadMediaSchema = z
  .object({
    fileBase64: z.string().min(16, "File content is required").max(8_000_000, "Payload exceeds maximum size"),
    mimeType: z.string().trim().min(3).max(64).optional(),
    claimedMimeType: z.string().trim().min(3).max(64).optional(),
    originalFilename: z.string().trim().min(1).max(200).optional(),
    folder: z
      .enum(["dezaakir/blogs", "dezaakir/projects", "dezaakir/profile", "dezaakir/general"])
      .optional()
      .default("dezaakir/general"),
    alt: z
      .string()
      .trim()
      .max(200)
      .transform((val) => sanitizePlainText(val))
      .optional()
      .default(""),
    caption: z
      .string()
      .trim()
      .max(500)
      .transform((val) => sanitizePlainText(val))
      .optional(),
    width: z.coerce.number().int().min(1).max(10_000).optional(),
    height: z.coerce.number().int().min(1).max(10_000).optional(),
  })
  .strict();

export const listMediaQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(24),
    folder: z
      .enum(["dezaakir/blogs", "dezaakir/projects", "dezaakir/profile", "dezaakir/general"])
      .optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

export const mediaIdParamSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid media ID"),
  })
  .strict();
