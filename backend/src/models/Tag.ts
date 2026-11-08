import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";
import { SLUG_PATTERN } from "../utils/text.js";

export interface ITag {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 60, match: SLUG_PATTERN },
  },
  baseOptions<ITag>(),
);

TagSchema.index({ slug: 1 }, { unique: true });

export const Tag: Model<ITag> = model<ITag>("Tag", TagSchema);
