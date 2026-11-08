import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions, CLOUDINARY_URL } from "./shared.js";

export const MEDIA_FORMATS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "pdf"] as const;

/** Cloudinary asset registered after a verified, signed upload. */
export interface IMedia {
  _id: Types.ObjectId;
  publicId: string;
  url: string;
  format: (typeof MEDIA_FORMATS)[number];
  bytes: number;
  width?: number;
  height?: number;
  alt: string;
  caption?: string;
  folder: string;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    publicId: { type: String, required: true, maxlength: 255 },
    url: { type: String, required: true, maxlength: 2048, match: CLOUDINARY_URL },
    format: { type: String, enum: MEDIA_FORMATS, required: true },
    bytes: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    width: { type: Number, min: 1, max: 20000 },
    height: { type: Number, min: 1, max: 20000 },
    alt: { type: String, default: "", trim: true, maxlength: 200 },
    caption: { type: String, trim: true, maxlength: 300 },
    folder: { type: String, required: true, maxlength: 100, match: /^[a-z0-9/_-]+$/ },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseOptions<IMedia>(),
);

MediaSchema.index({ publicId: 1 }, { unique: true });
MediaSchema.index({ createdAt: -1 });

export const Media: Model<IMedia> = model<IMedia>("Media", MediaSchema);
