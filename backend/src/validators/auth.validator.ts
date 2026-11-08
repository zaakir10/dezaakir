import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email must be at most 254 characters")
  .email("Invalid email address");

/**
 * Strong password policy:
 * - 10 to 128 characters
 * - At least one lowercase letter, one uppercase letter, one number, and one special character
 */
export const passwordPolicySchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Verification code must be a 6-digit number");

export const RegisterSchema = z
  .strictObject({
    name: z.string().trim().min(2, "Full name must be at least 2 characters").max(80, "Full name is too long"),
    email: emailSchema,
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const VerifyEmailSchema = z.strictObject({
  email: emailSchema,
  code: otpCodeSchema,
});

export const ResendVerificationSchema = z.strictObject({
  email: emailSchema,
});

export const LoginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "MFA code must be 6 digits")
    .optional(),
  recoveryCode: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .optional(),
});

export const ForgotPasswordSchema = z.strictObject({
  email: emailSchema,
});

export const ResetPasswordSchema = z
  .strictObject({
    token: z.string().trim().min(20, "Invalid reset token").max(256),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const ChangePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const UpdateProfileSchema = z.strictObject({
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(80, "Full name is too long"),
});

export const SessionIdParamSchema = z.strictObject({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid session id"),
});

export const MfaVerifySchema = z.strictObject({
  code: otpCodeSchema,
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
