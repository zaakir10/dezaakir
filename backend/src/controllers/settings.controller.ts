import type { RequestHandler } from "express";
import { SiteSettings, SETTINGS_KEY } from "../models/index.js";
import { recordAudit } from "../services/audit.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { sanitizePlainText } from "../utils/sanitizeHtml.js";
import type { UpdateSiteSettingsInput } from "../validators/settings.validator.js";

export const getPublicSettingsHandler: RequestHandler = async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const settings = await SiteSettings.getSingleton();
  sendSuccess(res, { settings });
};

export const updateSiteSettingsHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = req.body as UpdateSiteSettingsInput;

  const update: Record<string, unknown> = {};
  if (body.siteTitle !== undefined) update.siteTitle = sanitizePlainText(body.siteTitle);
  if (body.tagline !== undefined) update.tagline = sanitizePlainText(body.tagline);
  if (body.heroTitle !== undefined) update.heroTitle = sanitizePlainText(body.heroTitle);
  if (body.heroDescription !== undefined) update.heroDescription = sanitizePlainText(body.heroDescription);
  if (body.biography !== undefined) update.biography = sanitizePlainText(body.biography);
  if (body.profileImage !== undefined) update.profileImage = body.profileImage ?? undefined;
  if (body.cvUrl !== undefined) update.cvUrl = body.cvUrl ?? undefined;
  if (body.location !== undefined) update.location = sanitizePlainText(body.location);
  if (body.socialLinks !== undefined) update.socialLinks = body.socialLinks;
  if (body.skills !== undefined) {
    update.skills = body.skills.map((s) => ({
      name: sanitizePlainText(s.name),
      category: sanitizePlainText(s.category),
    }));
  }
  if (body.experience !== undefined) {
    update.experience = body.experience.map((e) => ({
      ...e,
      role: sanitizePlainText(e.role),
      company: sanitizePlainText(e.company),
      ...(e.location ? { location: sanitizePlainText(e.location) } : {}),
      ...(e.description ? { description: sanitizePlainText(e.description) } : {}),
    }));
  }
  if (body.education !== undefined) {
    update.education = body.education.map((ed) => ({
      ...ed,
      institution: sanitizePlainText(ed.institution),
      degree: sanitizePlainText(ed.degree),
      ...(ed.field ? { field: sanitizePlainText(ed.field) } : {}),
      ...(ed.description ? { description: sanitizePlainText(ed.description) } : {}),
    }));
  }
  if (body.careerInterests !== undefined) {
    update.careerInterests = body.careerInterests.map((c) => sanitizePlainText(c));
  }
  if (body.seo !== undefined) {
    update.seo = {
      ...(body.seo.defaultTitle ? { defaultTitle: sanitizePlainText(body.seo.defaultTitle) } : {}),
      ...(body.seo.defaultDescription ? { defaultDescription: sanitizePlainText(body.seo.defaultDescription) } : {}),
      ...(body.seo.ogImage ? { ogImage: body.seo.ogImage } : {}),
    };
  }

  await SiteSettings.getSingleton();
  const updated = await SiteSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  );

  await recordAudit({
    category: "ADMIN",
    action: "admin.update_settings",
    outcome: "SUCCESS",
    actor: req.user!._id,
    actorEmail: req.user!.email,
    targetType: "SiteSettings",
    req,
  });

  sendSuccess(res, { settings: updated });
};
