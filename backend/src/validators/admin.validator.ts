import { z } from "zod";

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().max(100).optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
    emailVerified: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
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
    { message: "At least one status change or session revocation flag must be provided" }
  );

export const listAuditLogsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
    category: z.enum(["AUTH", "ADMIN", "SECURITY", "SYSTEM"]).optional(),
    outcome: z.enum(["SUCCESS", "FAILURE", "DENIED"]).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();
