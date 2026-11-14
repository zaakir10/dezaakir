import { z } from "zod";
import { ROLES, CAMPAIGN_STATUSES, RECIPIENT_MODES } from "../models/index.js";

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().max(100).optional(),
    role: z.enum(ROLES).optional(),
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
    emailVerified: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    sortBy: z
      .enum(["createdAt", "lastLoginAt", "name", "email", "role", "status"])
      .optional()
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

export const userIdParamSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),
  })
  .strict();

export const updateUserStatusSchema = z
  .object({
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
    emailVerified: z.boolean().optional(),
    revokeSessions: z.boolean().optional().default(false),
  })
  .strict()
  .refine(
    (data) =>
      data.status !== undefined ||
      data.emailVerified !== undefined ||
      data.revokeSessions === true,
    { message: "At least one status change or session revocation flag must be provided" },
  );

export const updateUserRoleSchema = z
  .object({
    role: z.enum(ROLES),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

export const previewAdminEmailSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(1, "Subject is required")
      .max(180, "Subject is too long")
      .regex(/^[^\r\n]*$/, "Subject must not contain line breaks"),
    bodyHtml: z
      .string()
      .trim()
      .min(1, "Email content is required")
      .max(100_000, "Email content is too large"),
  })
  .strict();

export const sendAdminEmailSchema = z
  .object({
    recipientMode: z.enum(RECIPIENT_MODES),
    recipientIds: z
      .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid recipient user ID"))
      .max(500)
      .optional(),
    testEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .email("Invalid test email address")
      .optional(),
    subject: z
      .string()
      .trim()
      .min(2, "Subject must be at least 2 characters")
      .max(180, "Subject must be at most 180 characters")
      .regex(/^[^\r\n]*$/, "Subject must not contain line breaks"),
    bodyHtml: z
      .string()
      .trim()
      .min(5, "Email body must be at least 5 characters")
      .max(100_000, "Email body is too large"),
    respectMarketingConsent: z.boolean().optional().default(true),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.recipientMode === "SINGLE" && (!data.recipientIds || data.recipientIds.length !== 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientIds"],
        message: "Exactly one recipient user must be selected for single-user email delivery",
      });
    }
    if (data.recipientMode === "SELECTED" && (!data.recipientIds || data.recipientIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientIds"],
        message: "Select at least one user recipient",
      });
    }
  });

export const listEmailCampaignsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(CAMPAIGN_STATUSES).optional(),
    recipientMode: z.enum(RECIPIENT_MODES).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

export const campaignIdParamSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid campaign ID"),
  })
  .strict();

export const listAuditLogsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
    category: z.enum(["AUTH", "ADMIN", "SECURITY", "SYSTEM"]).optional(),
    outcome: z.enum(["SUCCESS", "FAILURE", "DENIED"]).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();
