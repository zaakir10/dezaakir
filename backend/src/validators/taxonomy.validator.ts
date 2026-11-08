import { z } from "zod";
import { CATEGORY_TYPES } from "../models/index.js";
import { SLUG_PATTERN } from "../utils/text.js";

export const CreateCategorySchema = z.strictObject({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(SLUG_PATTERN, "Invalid slug format")
    .optional(),
  type: z.enum(CATEGORY_TYPES),
  description: z.string().trim().max(300).optional(),
});

export const ListCategoriesQuerySchema = z.strictObject({
  type: z.enum(CATEGORY_TYPES).optional(),
});

export const CreateTagSchema = z.strictObject({
  name: z.string().trim().min(1, "Tag name is required").max(40),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .regex(SLUG_PATTERN, "Invalid slug format")
    .optional(),
});

export const ObjectIdParamSchema = z.strictObject({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier"),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
