import { z } from "zod";

const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .regex(/^https:\/\/[^\s<>"']+$/i, "Must be a valid HTTPS URL");

const optionalHttpsUrl = z
  .union([httpsUrlSchema, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalCvUrl = z
  .union([
    z
      .string()
      .trim()
      .max(2048)
      .regex(
        /^(\/[a-zA-Z0-9._/-]+|https:\/\/[^\s<>"']+)$/i,
        "CV URL must be an HTTPS URL or a local /path"
      ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v ? v : undefined));

const cloudinaryImageSchema = z.strictObject({
  media: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  url: z
    .string()
    .trim()
    .max(2048)
    .regex(/^https:\/\/res\.cloudinary\.com\/[^\s<>"']+$/i, "Image URL must be hosted on Cloudinary"),
  publicId: z.string().trim().min(1).max(255),
  alt: z.string().trim().max(200).default(""),
  width: z.number().int().min(1).max(20000).optional(),
  height: z.number().int().min(1).max(20000).optional(),
});

export const UpdateSiteSettingsSchema = z.strictObject({
  siteTitle: z.string().trim().min(2).max(80).optional(),
  authorName: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().trim().max(160).optional(),
  heroTitle: z.string().trim().max(160).optional(),
  heroDescription: z.string().trim().max(500).optional(),
  biography: z.string().trim().max(5000).optional(),
  profileImage: cloudinaryImageSchema.nullish(),
  cvUrl: optionalCvUrl,
  location: z.string().trim().max(100).optional(),
  socialLinks: z
    .strictObject({
      github: optionalHttpsUrl,
      linkedin: optionalHttpsUrl,
      x: optionalHttpsUrl,
      facebook: optionalHttpsUrl,
      tiktok: optionalHttpsUrl,
      youtube: optionalHttpsUrl,
      website: optionalHttpsUrl,
      email: z
        .union([z.string().trim().toLowerCase().max(254).email(), z.literal("")])
        .optional()
        .transform((v) => (v ? v : undefined)),
    })
    .optional(),
  skills: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1).max(50),
        category: z.string().trim().min(1).max(50),
      }),
    )
    .max(100)
    .optional(),
  experience: z
    .array(
      z.strictObject({
        role: z.string().trim().min(1).max(100),
        company: z.string().trim().min(1).max(100),
        location: z.string().trim().max(100).optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        current: z.boolean().default(false),
        description: z.string().trim().max(2000).optional(),
      }),
    )
    .max(50)
    .optional(),
  education: z
    .array(
      z.strictObject({
        institution: z.string().trim().min(1).max(150),
        degree: z.string().trim().min(1).max(150),
        field: z.string().trim().max(150).optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        description: z.string().trim().max(2000).optional(),
      }),
    )
    .max(20)
    .optional(),
  careerInterests: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  seo: z
    .strictObject({
      defaultTitle: z.string().trim().max(70).optional(),
      defaultDescription: z.string().trim().max(170).optional(),
      ogImage: cloudinaryImageSchema.nullish(),
    })
    .optional(),
});

export type UpdateSiteSettingsInput = z.infer<typeof UpdateSiteSettingsSchema>;
export { cloudinaryImageSchema, httpsUrlSchema };
