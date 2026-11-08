import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";
import { SLUG_PATTERN } from "../utils/text.js";

export const CATEGORY_TYPES = ["BLOG", "PROJECT"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  type: CategoryType;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80, match: SLUG_PATTERN },
    type: { type: String, enum: CATEGORY_TYPES, required: true },
    description: { type: String, trim: true, maxlength: 300 },
  },
  baseOptions<ICategory>(),
);

CategorySchema.index({ type: 1, slug: 1 }, { unique: true });

export const Category: Model<ICategory> = model<ICategory>("Category", CategorySchema);
