import { Router } from "express";
import {
  bulkMessagesHandler,
  deleteMessageHandler,
  listMessagesHandler,
  submitContactHandler,
  updateMessageStatusHandler,
} from "../controllers/contact.controller.js";
import { requireAdmin } from "../middleware/auth.js";
import { contactLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  BulkMessagesActionSchema,
  ContactSubmissionSchema,
  ListMessagesQuerySchema,
  MessageIdParamSchema,
  UpdateMessageStatusSchema,
} from "../validators/contact.validator.js";

export const contactRouter = Router();
export const adminMessagesRouter = Router();

// Public contact endpoint: POST /api/contact
contactRouter.post("/", contactLimiter, validate({ body: ContactSubmissionSchema }), submitContactHandler);

// Admin contact message management: GET /api/admin/messages, POST /api/admin/messages/bulk, PATCH /api/admin/messages/:id, DELETE /api/admin/messages/:id
adminMessagesRouter.use(requireAdmin);
adminMessagesRouter.get("/", validate({ query: ListMessagesQuerySchema }), listMessagesHandler);
adminMessagesRouter.post("/bulk", validate({ body: BulkMessagesActionSchema }), bulkMessagesHandler);
adminMessagesRouter.patch(
  "/:id",
  validate({ params: MessageIdParamSchema, body: UpdateMessageStatusSchema }),
  updateMessageStatusHandler,
);
adminMessagesRouter.delete(
  "/:id",
  validate({ params: MessageIdParamSchema }),
  deleteMessageHandler,
);
