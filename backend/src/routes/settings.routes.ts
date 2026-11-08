import { Router } from "express";
import { getPublicSettingsHandler, updateSiteSettingsHandler } from "../controllers/settings.controller.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { UpdateSiteSettingsSchema } from "../validators/settings.validator.js";

export const settingsRouter = Router();
export const adminSettingsRouter = Router();

settingsRouter.get("/", getPublicSettingsHandler);

adminSettingsRouter.use(requireAdmin);
adminSettingsRouter.put("/", validate({ body: UpdateSiteSettingsSchema }), updateSiteSettingsHandler);
