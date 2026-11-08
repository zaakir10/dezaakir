import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions, ImageSchema, type ImageRef } from "./shared.js";
import { SLUG_PATTERN } from "../utils/text.js";
import { trusted } from "../utils/query.js";

export const BLOG_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface IBlog {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  /** Rich text HTML — ALWAYS sanitized by the blog service before saving. */
  content: string;
  /** Plain text derived from content; used for search and reading time. */
  contentText: string;
  coverImage?: ImageRef;
  author: Types.ObjectId;
  category?: Types.ObjectId;
  tags: Types.ObjectId[];
  status: BlogStatus;
  featured: boolean;
  readingTime: number;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface BlogModel extends Model<IBlog> {
  /** Filter for content visible to the public: published (or scheduled and due), never drafts. */
  publicFilter(now?: Date): Record<string, unknown>;
}

const BlogSchema = new Schema<IBlog, BlogModel>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, match: SLUG_PATTERN },
    excerpt: { type: String, required: true, trim: true, maxlength: 400 },
    content: { type: String, required: true, maxlength: 500_000 },
    contentText: { type: String, default: "", maxlength: 500_000, select: false },
    coverImage: { type: ImageSchema },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    tags: {
      type: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
      default: [],
      validate: [(v: unknown[]) => v.length <= 15, "A post can have at most 15 tags"],
    },
    status: { type: String, enum: BLOG_STATUSES, default: "DRAFT", required: true },
    featured: { type: Boolean, default: false },
    readingTime: { type: Number, default: 1, min: 1, max: 600 },
    seoTitle: { type: String, trim: true, maxlength: 70 },
    seoDescription: { type: String, trim: true, maxlength: 170 },
    publishedAt: { type: Date },
  },
  baseOptions<IBlog>({}, ["contentText"]),
);

BlogSchema.pre("validate", function () {
  if ((this.status === "PUBLISHED" || this.status === "SCHEDULED") && !this.publishedAt) {
    if (this.status === "SCHEDULED") {
      this.invalidate("publishedAt", "Scheduled posts require a publication date");
    } else {
      this.publishedAt = new Date();
    }
  }
});

BlogSchema.static("publicFilter", function (now: Date = new Date()) {
  return {
    status: trusted({ $in: ["PUBLISHED", "SCHEDULED"] }),
    publishedAt: trusted({ $lte: now }),
  };
});

BlogSchema.index({ slug: 1 }, { unique: true });
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ featured: 1, status: 1, publishedAt: -1 });
BlogSchema.index({ category: 1, status: 1, publishedAt: -1 });
BlogSchema.index({ tags: 1, status: 1, publishedAt: -1 });
BlogSchema.index(
  { title: "text", excerpt: "text", contentText: "text" },
  { weights: { title: 10, excerpt: 4, contentText: 1 }, name: "blog_text" },
);

export const Blog = model<IBlog, BlogModel>("Blog", BlogSchema);
