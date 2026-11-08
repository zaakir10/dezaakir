import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions, HTTPS_URL, ImageSchema, type ImageRef } from "./shared.js";

export const SETTINGS_KEY = "site";

interface Skill {
  name: string;
  category: string;
}
interface Experience {
  role: string;
  company: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
}
interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}
interface SocialLinks {
  github?: string;
  linkedin?: string;
  x?: string;
  youtube?: string;
  website?: string;
  email?: string;
}

/** Singleton document (key = "site") holding editable public site content. */
export interface ISiteSettings {
  _id: Types.ObjectId;
  key: typeof SETTINGS_KEY;
  siteTitle: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  biography: string;
  profileImage?: ImageRef;
  cvUrl?: string;
  location?: string;
  socialLinks: SocialLinks;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  careerInterests: string[];
  seo: { defaultTitle: string; defaultDescription: string; ogImage?: ImageRef };
  createdAt: Date;
  updatedAt: Date;
}

interface SiteSettingsModel extends Model<ISiteSettings> {
  /** Returns the singleton, creating it with defaults on first access. */
  getSingleton(): Promise<ISiteSettings>;
}

const text = (max: number, required = false) => ({ type: String, trim: true, maxlength: max, required });
const httpsUrl = { type: String, trim: true, maxlength: 2048, match: HTTPS_URL };

const SiteSettingsSchema = new Schema<ISiteSettings, SiteSettingsModel>(
  {
    key: { type: String, enum: [SETTINGS_KEY], default: SETTINGS_KEY, required: true, immutable: true },
    siteTitle: { ...text(80, true), default: "Dezaakir" },
    tagline: { ...text(160), default: "Full-Stack Developer · AI · Modern Technology" },
    heroTitle: { ...text(160), default: "Building secure, modern software." },
    heroDescription: {
      ...text(500),
      default: "I design and build full-stack web applications and explore practical AI and emerging technology.",
    },
    biography: { ...text(5000), default: "" },
    profileImage: { type: ImageSchema },
    cvUrl: httpsUrl,
    location: text(100),
    socialLinks: {
      github: httpsUrl,
      linkedin: httpsUrl,
      x: httpsUrl,
      youtube: httpsUrl,
      website: httpsUrl,
      email: { type: String, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    },
    skills: {
      type: [new Schema<Skill>({ name: text(50, true), category: text(50, true) }, { _id: false })],
      default: [],
      validate: [(v: unknown[]) => v.length <= 100, "At most 100 skills"],
    },
    experience: {
      type: [
        new Schema<Experience>(
          {
            role: text(100, true),
            company: text(100, true),
            location: text(100),
            startDate: { type: Date, required: true },
            endDate: { type: Date },
            current: { type: Boolean, default: false },
            description: text(2000),
          },
          { _id: true },
        ),
      ],
      default: [],
      validate: [(v: unknown[]) => v.length <= 50, "At most 50 experience entries"],
    },
    education: {
      type: [
        new Schema<Education>(
          {
            institution: text(150, true),
            degree: text(150, true),
            field: text(150),
            startDate: { type: Date, required: true },
            endDate: { type: Date },
            description: text(2000),
          },
          { _id: true },
        ),
      ],
      default: [],
      validate: [(v: unknown[]) => v.length <= 20, "At most 20 education entries"],
    },
    careerInterests: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
      validate: [(v: unknown[]) => v.length <= 30, "At most 30 interests"],
    },
    seo: {
      defaultTitle: { ...text(70), default: "Dezaakir — Full-Stack Developer" },
      defaultDescription: {
        ...text(170),
        default: "Portfolio and technology blog of Dezaakir: full-stack development, AI and modern technology.",
      },
      ogImage: { type: ImageSchema },
    },
  },
  baseOptions<ISiteSettings>(),
);

SiteSettingsSchema.index({ key: 1 }, { unique: true });

SiteSettingsSchema.static("getSingleton", async function () {
  // Atomic upsert — safe under concurrent first requests.
  const doc = await this.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return doc as ISiteSettings;
});

export const SiteSettings = model<ISiteSettings, SiteSettingsModel>("SiteSettings", SiteSettingsSchema);
