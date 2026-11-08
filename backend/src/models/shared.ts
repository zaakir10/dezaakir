import mongoose, { Schema, type SchemaOptions } from "mongoose";

mongoose.set("strictQuery", true);
mongoose.set("strict", "throw");
mongoose.set("sanitizeFilter", true);
mongoose.set("translateAliases", false);

/**
 * Shared JSON serialisation: exposes `id` instead of `_id`, removes `__v`, and
 * strips any `hidden` paths (dot notation supported, e.g. "mfa.secretEncrypted").
 * Hidden fields never leave the server, even if accidentally selected.
 */
export function baseOptions<T>(extra: SchemaOptions<T> = {}, hidden: readonly string[] = []): SchemaOptions<T> {
  const transform = (_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    for (const path of hidden) {
      const parts = path.split(".");
      let target: Record<string, unknown> | undefined = ret;
      for (let i = 0; i < parts.length - 1 && target; i++) {
        const next: unknown = target[parts[i]!];
        target = next && typeof next === "object" ? (next as Record<string, unknown>) : undefined;
      }
      if (target) delete target[parts[parts.length - 1]!];
    }
    return ret;
  };

  return {
    strict: "throw",
    strictQuery: true,
    timestamps: true,
    id: false,
    toJSON: { virtuals: false, transform },
    toObject: { virtuals: false },
    ...extra,
  } as SchemaOptions<T>;
}

export const HTTPS_URL = /^https:\/\/[^\s<>"']+$/i;
export const CLOUDINARY_URL = /^https:\/\/res\.cloudinary\.com\/[^\s<>"']+$/i;

/** Embedded image reference (Cloudinary asset). */
export interface ImageRef {
  media?: Schema.Types.ObjectId;
  url: string;
  publicId: string;
  alt: string;
  width?: number;
  height?: number;
}

export const ImageSchema = new Schema<ImageRef>(
  {
    media: { type: Schema.Types.ObjectId, ref: "Media" },
    url: { type: String, required: true, maxlength: 2048, match: CLOUDINARY_URL },
    publicId: { type: String, required: true, maxlength: 255 },
    alt: { type: String, default: "", trim: true, maxlength: 200 },
    width: { type: Number, min: 1, max: 20000 },
    height: { type: Number, min: 1, max: 20000 },
  },
  { _id: false },
);
