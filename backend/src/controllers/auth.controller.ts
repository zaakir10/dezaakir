import type { RequestHandler } from "express";
import { deriveCsrfToken } from "../middleware/auth.js";
import {
  changePassword,
  enableMfa,
  getRecentLoginActivity,
  initiateMfaSetup,
  listUserSessions,
  loginUser,
  logoutAllSessions,
  logoutSession,
  registerUser,
  removeUserAvatar,
  requestEmailChange,
  requestPasswordReset,
  resendVerificationOtp,
  resetPassword,
  revokeUserSession,
  updateUserProfile,
  uploadUserAvatar,
  verifyEmailChange,
  verifyEmailOtp,
} from "../services/auth.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { clearSessionCookie, getSessionCookie, setSessionCookie } from "../utils/cookies.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  RequestEmailChangeInput,
  ResendVerificationInput,
  ResetPasswordInput,
  UpdateProfileInput,
  UploadAvatarInput,
  VerifyEmailChangeInput,
  VerifyEmailInput,
} from "../validators/auth.validator.js";

export const registerHandler: RequestHandler = async (req, res) => {
  const result = await registerUser(req.body as RegisterInput, req);
  sendSuccess(res, result, 201);
};

export const verifyEmailHandler: RequestHandler = async (req, res) => {
  const result = await verifyEmailOtp(req.body as VerifyEmailInput, req);
  sendSuccess(res, result);
};

export const resendVerificationHandler: RequestHandler = async (req, res) => {
  const result = await resendVerificationOtp(req.body as ResendVerificationInput, req);
  sendSuccess(res, result);
};

export const loginHandler: RequestHandler = async (req, res) => {
  const existingToken = getSessionCookie(req);
  const result = await loginUser(req.body as LoginInput, req, existingToken);
  setSessionCookie(res, result.rawSessionToken);
  res.setHeader("Cache-Control", "no-store");
  sendSuccess(res, {
    user: result.user,
    session: result.session,
    csrfToken: result.csrfToken,
    mfaEnrollmentRequired: result.mfaEnrollmentRequired,
  });
};

export const logoutHandler: RequestHandler = async (req, res) => {
  const rawToken = req.rawSessionToken ?? getSessionCookie(req);
  await logoutSession(rawToken, req);
  clearSessionCookie(res);
  res.setHeader("Cache-Control", "no-store");
  sendSuccess(res, { message: "Signed out successfully" });
};

export const logoutAllHandler: RequestHandler = async (req, res) => {
  const result = await logoutAllSessions(String(req.user!._id), req);
  clearSessionCookie(res);
  res.setHeader("Cache-Control", "no-store");
  sendSuccess(res, { message: "All sessions have been signed out", ...result });
};

export const forgotPasswordHandler: RequestHandler = async (req, res) => {
  const result = await requestPasswordReset(req.body as ForgotPasswordInput, req);
  sendSuccess(res, result);
};

export const resetPasswordHandler: RequestHandler = async (req, res) => {
  const result = await resetPassword(req.body as ResetPasswordInput, req);
  clearSessionCookie(res);
  sendSuccess(res, result);
};

export const meHandler: RequestHandler = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const csrfToken = req.rawSessionToken ? deriveCsrfToken(req.rawSessionToken) : undefined;
  const userObj = {
    id: String(req.user!._id),
    name: req.user!.name,
    email: req.user!.email,
    pendingEmail: req.user!.pendingEmail,
    avatar: req.user!.avatar,
    bio: req.user!.bio ?? "",
    location: req.user!.location ?? "",
    role: req.user!.role,
    emailVerified: req.user!.emailVerified,
    status: req.user!.status,
    lastLoginAt: req.user!.lastLoginAt,
    passwordChangedAt: req.user!.passwordChangedAt,
    preferences: {
      securityAlerts: req.user!.preferences?.securityAlerts ?? true,
      emailNotifications: req.user!.preferences?.emailNotifications ?? true,
    },
    mfa: {
      enabled: Boolean(req.user!.mfa?.enabled),
      enabledAt: req.user!.mfa?.enabledAt,
    },
    createdAt: req.user!.createdAt,
    updatedAt: req.user!.updatedAt,
  };
  sendSuccess(res, {
    user: userObj,
    session: {
      id: String(req.session!._id),
      mfaVerified: req.session!.mfaVerified,
      expiresAt: req.session!.expiresAt,
    },
    csrfToken,
  });
};

export const updateProfileHandler: RequestHandler = async (req, res) => {
  const updated = await updateUserProfile(String(req.user!._id), req.body as UpdateProfileInput, req);
  sendSuccess(res, { user: updated });
};

export const uploadAvatarHandler: RequestHandler = async (req, res) => {
  const updated = await uploadUserAvatar(String(req.user!._id), req.body as UploadAvatarInput, req);
  sendSuccess(res, { user: updated });
};

export const removeAvatarHandler: RequestHandler = async (req, res) => {
  const updated = await removeUserAvatar(String(req.user!._id), req);
  sendSuccess(res, { user: updated });
};

export const requestEmailChangeHandler: RequestHandler = async (req, res) => {
  const result = await requestEmailChange(String(req.user!._id), req.body as RequestEmailChangeInput, req);
  sendSuccess(res, result);
};

export const verifyEmailChangeHandler: RequestHandler = async (req, res) => {
  const result = await verifyEmailChange(String(req.user!._id), req.body as VerifyEmailChangeInput, req);
  sendSuccess(res, result);
};

export const loginActivityHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const activity = await getRecentLoginActivity(String(req.user!._id), String(req.session!._id));
  sendSuccess(res, { activity });
};

export const changePasswordHandler: RequestHandler = async (req, res) => {
  const result = await changePassword(
    String(req.user!._id),
    String(req.session!._id),
    req.body as ChangePasswordInput,
    req,
  );
  sendSuccess(res, result);
};

export const listSessionsHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const sessions = await listUserSessions(String(req.user!._id), String(req.session!._id));
  sendSuccess(res, { sessions });
};

export const revokeSessionHandler: RequestHandler = async (req, res) => {
  const targetId = String(req.params.id);
  await revokeUserSession(String(req.user!._id), targetId, req);
  if (String(req.session!._id) === targetId) {
    clearSessionCookie(res);
  }
  sendSuccess(res, { message: "Session revoked" });
};

export const mfaSetupHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const result = await initiateMfaSetup(String(req.user!._id), req);
  sendSuccess(res, result);
};

export const mfaEnableHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { code } = req.body as { code: string };
  const result = await enableMfa(String(req.user!._id), String(req.session!._id), code, req);
  sendSuccess(res, result);
};
