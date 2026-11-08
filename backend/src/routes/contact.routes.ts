import { Router } from "express";
import {
  listMessagesHandler,
  submitContactHandler,
  updateMessageStatusHandler,
} from "../controllers/contact.controller.js";
import { requireAdmin } from "../middleware/auth.js";
import { contactLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  ContactSubmissionSchema,
  ListMessagesQuerySchema,
  MessageIdParamSchema,
  UpdateMessageStatusSchema,
} from "../validators/contact.validator.js";

export const contactRouter = Router();
export const adminMessagesRouter = Router();

// Public contact endpoint: POST /api/contact
contactRouter.post("/", contactLimiter, validate({ body: ContactSubmissionSchema }), submitContactHandler);

// Admin contact message management: GET /api/admin/messages & PATCH /api/admin/messages/:id
adminMessagesRouter.use(requireAdmin);
adminMessagesRouter.get("/", validate({ query: ListMessagesQuerySchema }), listMessagesHandler);
adminMessagesRouter.patch(
  "/:id",
  validate({ params: MessageIdParamSchema, body: UpdateMessageStatusSchema }),
  updateMessageStatusHandler,
);
