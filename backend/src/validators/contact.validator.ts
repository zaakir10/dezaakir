import { z } from "zod";
import { MESSAGE_STATUSES } from "../models/index.js";
import { emailSchema } from "./auth.validator.js";

export const ContactSubmissionSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  email: emailSchema,
  subject: z
    .string()
    .trim()
    .min(2, "Subject must be at least 2 characters")
    .max(150, "Subject is too long")
    .regex(/^[^\r\n]*$/, "Subject must not contain line breaks"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be at most 5000 characters"),
  /** Hidden honeypot field — legitimate users leave this empty; bots fill it in. */
  website: z.string().max(200).optional(),
});

export const ListMessagesQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(MESSAGE_STATUSES).optional(),
});

export const MessageIdParamSchema = z.strictObject({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid message id"),
});

export const UpdateMessageStatusSchema = z.strictObject({
  status: z.enum(MESSAGE_STATUSES),
});

export type ContactSubmissionInput = z.infer<typeof ContactSubmissionSchema>;
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;
export type UpdateMessageStatusInput = z.infer<typeof UpdateMessageStatusSchema>;
