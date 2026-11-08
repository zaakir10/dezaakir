import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  signUploadSchema,
  uploadMediaSchema,
  listMediaQuerySchema,
  mediaIdParamSchema,
} from "../validators/media.validator.js";
import {
  signMediaUploadHandler,
  uploadMediaHandler,
  listMediaHandler,
  deleteMediaHandler,
} from "../controllers/media.controller.js";

export const adminMediaRouter = Router();

adminMediaRouter.use(requireAdmin);

adminMediaRouter.get(
  "/",
  validate({ query: listMediaQuerySchema }),
  listMediaHandler
);

adminMediaRouter.post(
  "/sign",
  validate({ body: signUploadSchema }),
  signMediaUploadHandler
);

adminMediaRouter.post(
  "/upload",
  validate({ body: uploadMediaSchema }),
  uploadMediaHandler
);

adminMediaRouter.delete(
  "/:id",
  validate({ params: mediaIdParamSchema }),
  deleteMediaHandler
);
