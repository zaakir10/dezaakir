import { Router } from "express";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  listSessionsHandler,
  loginActivityHandler,
  loginHandler,
  logoutAllHandler,
  logoutHandler,
  meHandler,
  mfaEnableHandler,
  mfaSetupHandler,
  registerHandler,
  removeAvatarHandler,
  requestEmailChangeHandler,
  resendVerificationHandler,
  resetPasswordHandler,
  revokeSessionHandler,
  updateProfileHandler,
  uploadAvatarHandler,
  verifyEmailChangeHandler,
  verifyEmailHandler,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loginLimiter,
  otpResendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  registerLimiter,
} from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  MfaVerifySchema,
  RegisterSchema,
  RequestEmailChangeSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  SessionIdParamSchema,
  UpdateProfileSchema,
  UploadAvatarSchema,
  VerifyEmailChangeSchema,
  VerifyEmailSchema,
} from "../validators/auth.validator.js";

export const authRouter = Router();

// Public authentication & email verification routes
authRouter.post("/register", registerLimiter, validate({ body: RegisterSchema }), registerHandler);
authRouter.post("/verify-email", otpVerifyLimiter, validate({ body: VerifyEmailSchema }), verifyEmailHandler);
authRouter.post(
  "/resend-verification",
  otpResendLimiter,
  validate({ body: ResendVerificationSchema }),
  resendVerificationHandler,
);
authRouter.post("/login", loginLimiter, validate({ body: LoginSchema }), loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.post("/forgot-password", passwordResetLimiter, validate({ body: ForgotPasswordSchema }), forgotPasswordHandler);
authRouter.post("/reset-password", passwordResetLimiter, validate({ body: ResetPasswordSchema }), resetPasswordHandler);

// Authenticated account & session management routes
authRouter.get("/me", requireAuth, meHandler);
authRouter.patch("/me", requireAuth, validate({ body: UpdateProfileSchema }), updateProfileHandler);
authRouter.post("/avatar", requireAuth, validate({ body: UploadAvatarSchema }), uploadAvatarHandler);
authRouter.delete("/avatar", requireAuth, removeAvatarHandler);
authRouter.post(
  "/change-email/request",
  requireAuth,
  otpResendLimiter,
  validate({ body: RequestEmailChangeSchema }),
  requestEmailChangeHandler,
);
authRouter.post(
  "/change-email/verify",
  requireAuth,
  otpVerifyLimiter,
  validate({ body: VerifyEmailChangeSchema }),
  verifyEmailChangeHandler,
);
authRouter.get("/login-activity", requireAuth, loginActivityHandler);
authRouter.post("/change-password", requireAuth, validate({ body: ChangePasswordSchema }), changePasswordHandler);
authRouter.post("/logout-all", requireAuth, logoutAllHandler);
authRouter.get("/sessions", requireAuth, listSessionsHandler);
authRouter.delete("/sessions/:id", requireAuth, validate({ params: SessionIdParamSchema }), revokeSessionHandler);

// TOTP Multi-Factor Authentication enrollment routes
authRouter.post("/mfa/setup", requireAuth, mfaSetupHandler);
authRouter.post("/mfa/enable", requireAuth, validate({ body: MfaVerifySchema }), mfaEnableHandler);
