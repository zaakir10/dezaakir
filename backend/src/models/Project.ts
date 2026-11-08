import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions, HTTPS_URL, ImageSchema, type ImageRef } from "./shared.js";
import { SLUG_PATTERN } from "../utils/text.js";
import { trusted } from "../utils/query.js";

export const PROJECT_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface IProject {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  /** Short summary shown on cards. */
  summary: string;
  /** Long-form rich text HTML — sanitized by the project service before saving. */
  description: string;
  coverImage?: ImageRef;
  images: ImageRef[];
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  category?: Types.ObjectId;
  featured: boolean;
  status: ProjectStatus;
  order: number;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectModel extends Model<IProject> {
  publicFilter(now?: Date): Record<string, unknown>;
}

const ProjectSchema = new Schema<IProject, ProjectModel>(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, match: SLUG_PATTERN },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, maxlength: 200_000 },
    coverImage: { type: ImageSchema },
    images: {
      type: [ImageSchema],
      default: [],
      validate: [(v: unknown[]) => v.length <= 20, "A project can have at most 20 screenshots"],
    },
    technologies: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
      validate: [(v: unknown[]) => v.length <= 30, "At most 30 technologies"],
    },
    githubUrl: { type: String, trim: true, maxlength: 2048, match: /^https:\/\/(www\.)?github\.com\/[^\s<>"']+$/i },
    liveUrl: { type: String, trim: true, maxlength: 2048, match: HTTPS_URL },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: PROJECT_STATUSES, default: "DRAFT", required: true },
    order: { type: Number, default: 0, min: -10000, max: 10000 },
    seoTitle: { type: String, trim: true, maxlength: 70 },
    seoDescription: { type: String, trim: true, maxlength: 170 },
    publishedAt: { type: Date },
  },
  baseOptions<IProject>(),
);

ProjectSchema.pre("validate", function () {
  if (this.status === "PUBLISHED" && !this.publishedAt) this.publishedAt = new Date();
});

ProjectSchema.static("publicFilter", function (now: Date = new Date()) {
  return { status: "PUBLISHED", publishedAt: trusted({ $lte: now }) };
});

ProjectSchema.index({ slug: 1 }, { unique: true });
ProjectSchema.index({ status: 1, featured: -1, order: 1, publishedAt: -1 });
ProjectSchema.index({ category: 1, status: 1 });
ProjectSchema.index({ technologies: 1 });

export const Project = model<IProject, ProjectModel>("Project", ProjectSchema);
