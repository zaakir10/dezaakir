"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { apiRequest, ApiClientError } from "@/lib/api";
import type { LoginActivityItem, User } from "@/types";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ActiveTab = "profile" | "security";

interface PasswordStrengthResult {
  score: number; // 0..5
  label: string;
  checks: {
    minLength: boolean;
    hasLower: boolean;
    hasUpper: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 10,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ["Empty", "Weak", "Fair", "Moderate", "Good", "Strong"];
  return {
    score: password.length === 0 ? 0 : score,
    label: password.length === 0 ? "Enter a new password" : (labels[score] ?? "Strong"),
    checks,
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DZ";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshAuth, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");

  // Personal Information State
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Avatar Upload State
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingAvatarPayload, setPendingAvatarPayload] = useState<{
    fileBase64: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  } | null>(null);

  // Security Notification Preferences State
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsFeedback, setPrefsFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Update Email Address State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Clean Login Activity State (Date, Time & Device Name ONLY)
  const [loginActivity, setLoginActivity] = useState<LoginActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Synchronize local form fields with authenticated user
  const syncUserFields = useCallback((u: User) => {
    setName(u.name ?? "");
    setBio(u.bio ?? "");
    setLocation(u.location ?? "");
    setSecurityAlerts(u.preferences?.securityAlerts ?? true);
    setEmailNotifications(u.preferences?.emailNotifications ?? true);
  }, []);

  useEffect(() => {
    if (user) {
      syncUserFields(user);
    }
  }, [user, syncUserFields]);

  const loadLoginActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await apiRequest<{ activity: LoginActivityItem[] }>("/api/auth/login-activity");
      setLoginActivity(res.data.activity);
    } catch {
      // Non-blocking fallback
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      void loadLoginActivity();
    }
  }, [authLoading, user, router, loadLoginActivity]);

  const isProfileDirty = useMemo(() => {
    if (!user) return false;
    return (
      name.trim() !== (user.name ?? "").trim() ||
      bio.trim() !== (user.bio ?? "").trim() ||
      location.trim() !== (user.location ?? "").trim() ||
      pendingAvatarPayload !== null
    );
  }, [user, name, bio, location, pendingAvatarPayload]);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  // Avatar file selection handler
  const handleSelectAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileFeedback(null);
    const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
    if (!allowedMimes.includes(file.type as (typeof allowedMimes)[number])) {
      setProfileFeedback({
        type: "error",
        text: "Please select a PNG, JPEG, WebP, or GIF image.",
      });
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setProfileFeedback({
        type: "error",
        text: "Profile picture must be 2.5 MB or smaller.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreviewUrl(reader.result);
        setPendingAvatarPayload({
          fileBase64: reader.result,
          mimeType: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPendingAvatar = async () => {
    if (!pendingAvatarPayload) return;
    setAvatarUploading(true);
    setProfileFeedback(null);
    try {
      await apiRequest("/api/auth/avatar", {
        method: "POST",
        body: JSON.stringify({
          fileBase64: pendingAvatarPayload.fileBase64,
          mimeType: pendingAvatarPayload.mimeType,
          alt: `${name.trim() || user?.name || "User"} profile picture`,
        }),
      });
      setPendingAvatarPayload(null);
      setAvatarPreviewUrl(null);
      await refreshAuth();
      setProfileFeedback({
        type: "success",
        text: "Profile picture updated.",
      });
    } catch (err) {
      setProfileFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to upload profile picture.",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    setProfileFeedback(null);
    try {
      await apiRequest("/api/auth/avatar", { method: "DELETE" });
      setPendingAvatarPayload(null);
      setAvatarPreviewUrl(null);
      await refreshAuth();
      setProfileFeedback({
        type: "success",
        text: "Profile picture removed.",
      });
    } catch (err) {
      setProfileFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to remove profile picture.",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setProfileFeedback({
        type: "error",
        text: "Full name must be at least 2 characters.",
      });
      return;
    }

    setProfileSaving(true);
    try {
      if (pendingAvatarPayload) {
        await apiRequest("/api/auth/avatar", {
          method: "POST",
          body: JSON.stringify({
            fileBase64: pendingAvatarPayload.fileBase64,
            mimeType: pendingAvatarPayload.mimeType,
            alt: `${trimmedName} profile picture`,
          }),
        });
        setPendingAvatarPayload(null);
        setAvatarPreviewUrl(null);
      }

      await apiRequest("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: trimmedName,
          bio: bio.trim(),
          location: location.trim(),
        }),
      });

      await refreshAuth();
      setProfileFeedback({
        type: "success",
        text: "Your profile changes have been saved.",
      });
    } catch (err) {
      setProfileFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Unable to update profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelProfileEdits = () => {
    if (!user) return;
    syncUserFields(user);
    setPendingAvatarPayload(null);
    setAvatarPreviewUrl(null);
    setProfileFeedback(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);

    if (!currentPassword) {
      setPwFeedback({ type: "error", text: "Please enter your current password." });
      return;
    }
    if (passwordStrength.score < 5) {
      setPwFeedback({
        type: "error",
        text: "New password must meet all 5 security requirements listed below.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwFeedback({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    setPwSaving(true);
    try {
      const res = await apiRequest<{ message: string }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setPwFeedback({ type: "success", text: res.data.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshAuth();
    } catch (err) {
      setPwFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to change password.",
      });
    } finally {
      setPwSaving(false);
    }
  };

  const handleTogglePreference = async (
    key: "securityAlerts" | "emailNotifications",
    nextVal: boolean,
  ) => {
    setPrefsFeedback(null);
    const updatedSecurity = key === "securityAlerts" ? nextVal : securityAlerts;
    const updatedEmails = key === "emailNotifications" ? nextVal : emailNotifications;

    if (key === "securityAlerts") setSecurityAlerts(nextVal);
    if (key === "emailNotifications") setEmailNotifications(nextVal);

    setPrefsSaving(true);
    try {
      await apiRequest("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          preferences: {
            securityAlerts: updatedSecurity,
            emailNotifications: updatedEmails,
          },
        }),
      });
      await refreshAuth();
      setPrefsFeedback({
        type: "success",
        text: "Notification preferences updated.",
      });
    } catch (err) {
      setPrefsFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to update preferences.",
      });
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);
    setEmailSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; pendingEmail: string }>(
        "/api/auth/change-email/request",
        {
          method: "POST",
          body: JSON.stringify({
            newEmail: newEmailInput.trim(),
            currentPassword: emailCurrentPassword,
          }),
        },
      );
      setEmailStep("verify");
      setEmailFeedback({ type: "success", text: res.data.message });
      await refreshAuth();
    } catch (err) {
      setEmailFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Unable to request email update.",
      });
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);
    setEmailSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>("/api/auth/change-email/verify", {
        method: "POST",
        body: JSON.stringify({ code: emailOtpCode.trim() }),
      });
      setEmailFeedback({ type: "success", text: res.data.message });
      setNewEmailInput("");
      setEmailCurrentPassword("");
      setEmailOtpCode("");
      await refreshAuth();
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailStep("request");
        setEmailFeedback(null);
      }, 1200);
    } catch (err) {
      setEmailFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Invalid verification code.",
      });
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleSecureLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="h-44 animate-pulse border border-white/15 bg-white/[0.03]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="h-80 animate-pulse border border-white/15 bg-white/[0.03]" />
          <div className="h-80 animate-pulse border border-white/15 bg-white/[0.03] lg:col-span-2" />
        </div>
      </div>
    );
  }

  const displayedAvatarUrl = avatarPreviewUrl ?? user.avatar?.url ?? null;
  const isAdminRole = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      {/* Top Profile Banner */}
      <div className="border border-white/20 bg-white/[0.02] p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {/* Avatar Container */}
            <div className="relative group">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border-2 border-white bg-navy text-2xl font-bold tracking-wider text-white">
                {displayedAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayedAvatarUrl}
                    alt={`${user.name} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getInitials(user.name)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center border border-navy bg-white text-navy transition hover:bg-white/90"
                title="Upload profile picture"
                aria-label="Upload profile picture"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleSelectAvatarFile}
                className="hidden"
              />
            </div>

            {/* Identity Details */}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white">
                  {user.role.replace("_", " ")}
                </span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 border border-white bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 border border-white/40 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-white/80">
                    Unverified
                  </span>
                )}
              </div>

              <p className="mt-1.5 font-mono text-xs text-white/75">{user.email}</p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/65">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-white/70" />
                  Joined {formatDate(user.createdAt)}
                </span>
                {user.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-white/70" />
                    {user.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdminRole && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Admin Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={handleSecureLogout}
              className="inline-flex items-center gap-2 border border-white/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Secure Logout
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/15 pt-5">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "profile"
                ? "bg-white text-navy"
                : "border border-white/20 text-white/80 hover:border-white hover:text-white"
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Personal Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "security"
                ? "bg-white text-navy"
                : "border border-white/20 text-white/80 hover:border-white hover:text-white"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Account Security
          </button>
        </div>
      </div>

      {/* TAB 1: PERSONAL PROFILE */}
      {activeTab === "profile" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Left Column: Account Summary & Profile Picture Controls */}
          <div className="space-y-6">
            {/* Profile Picture Card */}
            <div className="border border-white/15 bg-white/[0.02] p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Profile Picture
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                Upload a professional photo (PNG, JPEG, WebP, or GIF up to 2.5 MB).
              </p>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-white/30 bg-navy text-lg font-bold text-white">
                  {displayedAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayedAvatarUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(user.name)}</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1.5 border border-white/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Choose Image
                  </button>
                  {(user.avatar?.url || pendingAvatarPayload) && (
                    <button
                      type="button"
                      onClick={
                        pendingAvatarPayload
                          ? () => {
                              setPendingAvatarPayload(null);
                              setAvatarPreviewUrl(null);
                            }
                          : handleRemoveAvatar
                      }
                      disabled={avatarUploading}
                      className="inline-flex items-center gap-1.5 text-left text-xs text-white/70 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {pendingAvatarPayload ? "Discard Selection" : "Remove Photo"}
                    </button>
                  )}
                </div>
              </div>

              {pendingAvatarPayload && (
                <div className="mt-4 border border-white/25 bg-white/[0.04] p-3">
                  <p className="text-xs text-white/85">New image selected and ready to upload.</p>
                  <button
                    type="button"
                    onClick={handleUploadPendingAvatar}
                    disabled={avatarUploading}
                    className="mt-2.5 w-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-50"
                  >
                    {avatarUploading ? "Uploading..." : "Upload Picture Now"}
                  </button>
                </div>
              )}
            </div>

            {/* Account Overview Card */}
            <div className="border border-white/15 bg-white/[0.02] p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Account Overview
              </h2>
              <dl className="mt-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <dt className="text-white/65">Verification Status</dt>
                  <dd className="font-mono font-semibold text-white">
                    {user.emailVerified ? "Verified" : "Pending"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <dt className="text-white/65">Account Status</dt>
                  <dd className="font-mono font-semibold text-white">{user.status}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <dt className="text-white/65">Account Role</dt>
                  <dd className="font-mono font-semibold text-white">
                    {user.role.replace("_", " ")}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <dt className="text-white/65">Member Since</dt>
                  <dd className="font-mono text-white">{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/65">Last Sign-In</dt>
                  <dd className="font-mono text-white">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Current Session"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Right Column: Editable Personal Information Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSaveProfile}
              className="border border-white/15 bg-white/[0.02] p-6 md:p-8"
            >
              <div className="border-b border-white/15 pb-4">
                <h2 className="text-lg font-bold text-white">Personal Information</h2>
                <p className="mt-1 text-xs text-white/65">
                  Update your name, biography, and location associated with your Dezaakir profile.
                </p>
              </div>

              {profileFeedback && (
                <div
                  role="status"
                  className={`mt-5 flex items-center justify-between border px-4 py-3 text-xs ${
                    profileFeedback.type === "success"
                      ? "border-white bg-white text-navy font-semibold"
                      : "border-white/50 bg-white/10 text-white"
                  }`}
                >
                  <span>{profileFeedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setProfileFeedback(null)}
                    className="ml-3 opacity-75 hover:opacity-100"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profile-name"
                      className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                    >
                      Full Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-location"
                      className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                    >
                      Location
                    </label>
                    <input
                      id="profile-location"
                      type="text"
                      maxLength={100}
                      placeholder="e.g. Mogadishu, Somalia"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-2 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                    >
                      Email Address
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("security");
                        setEmailModalOpen(true);
                        setEmailStep(user.pendingEmail ? "verify" : "request");
                      }}
                      className="text-xs font-semibold text-white underline underline-offset-4 hover:text-white/80"
                    >
                      Update Email Address
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between border border-white/15 bg-white/[0.03] px-3.5 py-2.5">
                    <span className="font-mono text-sm text-white/85">{user.email}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-white/65">
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                  {user.pendingEmail && (
                    <p className="mt-1.5 text-xs text-white/75">
                      Pending verification for new email: <strong>{user.pendingEmail}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-bio"
                      className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                    >
                      Professional Bio
                    </label>
                    <span className="font-mono text-[11px] text-white/50">
                      {bio.length}/500
                    </span>
                  </div>
                  <textarea
                    id="profile-bio"
                    rows={4}
                    maxLength={500}
                    placeholder="Write a brief professional summary or bio..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-2 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/35 focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-white/15 pt-5">
                <button
                  type="button"
                  onClick={handleCancelProfileEdits}
                  disabled={!isProfileDirty || profileSaving}
                  className="border border-white/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isProfileDirty || profileSaving}
                  className="bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-40"
                >
                  {profileSaving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT SECURITY */}
      {activeTab === "security" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Left 7 Columns: Change Password & Email Verification */}
          <div className="space-y-8 lg:col-span-7">
            {/* Change Password Card with Strength Indicator */}
            <form
              onSubmit={handleChangePassword}
              className="border border-white/15 bg-white/[0.02] p-6 md:p-8"
            >
              <div className="flex items-start justify-between border-b border-white/15 pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <KeyRound className="h-5 w-5" />
                    Change Password
                  </h2>
                  <p className="mt-1 text-xs text-white/65">
                    Use a strong, unique password to protect your Dezaakir account.
                  </p>
                </div>
                {user.passwordChangedAt && (
                  <span className="font-mono text-[11px] text-white/60">
                    Updated {formatDate(user.passwordChangedAt)}
                  </span>
                )}
              </div>

              {pwFeedback && (
                <div
                  role="status"
                  className={`mt-5 flex items-center justify-between border px-4 py-3 text-xs ${
                    pwFeedback.type === "success"
                      ? "border-white bg-white text-navy font-semibold"
                      : "border-white/50 bg-white/10 text-white"
                  }`}
                >
                  <span>{pwFeedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setPwFeedback(null)}
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="current-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                    >
                      Current Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
                    >
                      {showPasswords ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Show
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    id="current-password"
                    type={showPasswords ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="mt-2 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                  >
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type={showPasswords ? "text" : "password"}
                    required
                    minLength={10}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="mt-2 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                  />

                  {/* Password Strength Indicator */}
                  <div className="mt-3 border border-white/15 bg-white/[0.02] p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wider text-white/75">
                        Password Strength
                      </span>
                      <span className="font-mono font-bold text-white">
                        {passwordStrength.label} ({passwordStrength.score}/5)
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 transition-all ${
                            passwordStrength.score >= step ? "bg-white" : "bg-white/15"
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="mt-3 grid gap-1.5 text-[11px] sm:grid-cols-2">
                      {[
                        { ok: passwordStrength.checks.minLength, text: "At least 10 characters" },
                        { ok: passwordStrength.checks.hasUpper, text: "Uppercase letter (A–Z)" },
                        { ok: passwordStrength.checks.hasLower, text: "Lowercase letter (a–z)" },
                        { ok: passwordStrength.checks.hasNumber, text: "Number (0–9)" },
                        { ok: passwordStrength.checks.hasSpecial, text: "Special symbol (!@#$...)" },
                      ].map((item) => (
                        <li
                          key={item.text}
                          className={`flex items-center gap-1.5 ${
                            item.ok ? "font-semibold text-white" : "text-white/55"
                          }`}
                        >
                          <Check className={`h-3 w-3 ${item.ok ? "opacity-100" : "opacity-30"}`} />
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPasswords ? "text" : "password"}
                    required
                    minLength={10}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="mt-2 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-white/15 pt-5">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-50"
                >
                  {pwSaving ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>

            {/* Email Verification & Update Email Address Card */}
            <div className="border border-white/15 bg-white/[0.02] p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Mail className="h-5 w-5" />
                    Email Verification &amp; Address
                  </h2>
                  <p className="mt-1 text-xs text-white/65">
                    Manage your verified primary email address used for sign-in and account recovery.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 border border-white bg-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-navy">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {user.emailVerified ? "Verified" : "Unverified"}
                </span>
              </div>

              <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/60">
                    Current Email Address
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-white">
                    {user.email}
                  </div>
                  {user.pendingEmail && (
                    <div className="mt-1 text-xs text-white/75">
                      Awaiting OTP verification for: <strong>{user.pendingEmail}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmailModalOpen((prev) => !prev);
                    setEmailStep(user.pendingEmail ? "verify" : "request");
                    setEmailFeedback(null);
                  }}
                  className="border border-white/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
                >
                  {emailModalOpen ? "Close Email Form" : "Change Email Address"}
                </button>
              </div>

              {emailModalOpen && (
                <div className="mt-6 border border-white/20 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between border-b border-white/15 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {emailStep === "request"
                        ? "Step 1: Request Email Address Change"
                        : "Step 2: Enter 6-Digit Verification Code"}
                    </h3>
                    {emailStep === "verify" && (
                      <button
                        type="button"
                        onClick={() => setEmailStep("request")}
                        className="text-xs text-white/70 underline hover:text-white"
                      >
                        Use a different email
                      </button>
                    )}
                  </div>

                  {emailFeedback && (
                    <div
                      className={`mt-4 border px-3.5 py-2.5 text-xs ${
                        emailFeedback.type === "success"
                          ? "border-white bg-white text-navy font-semibold"
                          : "border-white/50 bg-white/10 text-white"
                      }`}
                    >
                      {emailFeedback.text}
                    </div>
                  )}

                  {emailStep === "request" ? (
                    <form onSubmit={handleRequestEmailChange} className="mt-4 space-y-4">
                      <div>
                        <label
                          htmlFor="new-email-input"
                          className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                        >
                          New Email Address
                        </label>
                        <input
                          id="new-email-input"
                          type="email"
                          required
                          value={newEmailInput}
                          onChange={(e) => setNewEmailInput(e.target.value)}
                          placeholder="new-address@example.com"
                          className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2 text-sm text-white focus:border-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email-current-pw"
                          className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                        >
                          Confirm Current Password
                        </label>
                        <input
                          id="email-current-pw"
                          type="password"
                          required
                          value={emailCurrentPassword}
                          onChange={(e) => setEmailCurrentPassword(e.target.value)}
                          className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2 text-sm text-white focus:border-white focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEmailModalOpen(false)}
                          className="border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={emailSubmitting}
                          className="bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-navy disabled:opacity-50"
                        >
                          {emailSubmitting ? "Sending Code..." : "Send Verification Code"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyEmailChange} className="mt-4 space-y-4">
                      <div>
                        <label
                          htmlFor="email-otp-code"
                          className="block text-xs font-semibold uppercase tracking-wider text-white/85"
                        >
                          6-Digit Verification Code
                        </label>
                        <input
                          id="email-otp-code"
                          type="text"
                          inputMode="numeric"
                          pattern="\d{6}"
                          maxLength={6}
                          required
                          placeholder="123456"
                          value={emailOtpCode}
                          onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                          className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.5em] text-white focus:border-white focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEmailModalOpen(false)}
                          className="border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={emailSubmitting || emailOtpCode.length !== 6}
                          className="bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-navy disabled:opacity-50"
                        >
                          {emailSubmitting ? "Verifying..." : "Verify & Update Email"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Security Notifications, Clean Login Activity & Secure Logout */}
          <div className="space-y-8 lg:col-span-5">
            {/* Security & Email Notification Preferences */}
            <div className="border border-white/15 bg-white/[0.02] p-6">
              <div className="border-b border-white/15 pb-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-white">
                  <Bell className="h-4 w-4" />
                  Security Notifications
                </h2>
                <p className="mt-1 text-xs text-white/65">
                  Control automated security alerts and platform announcements.
                </p>
              </div>

              {prefsFeedback && (
                <div className="mt-4 border border-white/30 bg-white/[0.06] px-3 py-2 text-xs text-white">
                  {prefsFeedback.text}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-xs font-bold text-white">
                      Account Security Alerts
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      Receive email alerts when your password, email address, or account role is changed.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={securityAlerts}
                    disabled={prefsSaving}
                    onClick={() => handleTogglePreference("securityAlerts", !securityAlerts)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center border transition ${
                      securityAlerts
                        ? "border-white bg-white"
                        : "border-white/30 bg-navy"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transition ${
                        securityAlerts
                          ? "translate-x-5 bg-navy"
                          : "translate-x-1 bg-white/60"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-white">
                      Platform Updates &amp; Announcements
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      Receive occasional product announcements and engineering updates from Dezaakir.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emailNotifications}
                    disabled={prefsSaving}
                    onClick={() =>
                      handleTogglePreference("emailNotifications", !emailNotifications)
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center border transition ${
                      emailNotifications
                        ? "border-white bg-white"
                        : "border-white/30 bg-navy"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transition ${
                        emailNotifications
                          ? "translate-x-5 bg-navy"
                          : "translate-x-1 bg-white/60"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Login Activity (Date, Time, and Human-Friendly Device Name ONLY) */}
            <div className="border border-white/15 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-white">
                    <Clock className="h-4 w-4" />
                    Recent Login Activity
                  </h2>
                  <p className="mt-1 text-xs text-white/65">
                    Recent sign-in events on your account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadLoginActivity}
                  disabled={activityLoading}
                  className="border border-white/20 p-2 text-white/75 transition hover:border-white hover:text-white"
                  aria-label="Refresh login activity"
                  title="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${activityLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="mt-4 divide-y divide-white/10">
                {activityLoading && loginActivity.length === 0 ? (
                  <div className="py-6 text-center text-xs text-white/60">
                    Loading recent sign-in activity...
                  </div>
                ) : loginActivity.length === 0 ? (
                  <div className="py-6 text-center text-xs text-white/60">
                    No recent login history recorded yet.
                  </div>
                ) : (
                  loginActivity.slice(0, 5).map((item) => {
                    const dt = new Date(item.timestamp);
                    const formattedDate = dt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const formattedTime = dt.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-3.5 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/20 bg-white/[0.03] text-white">
                            <Monitor className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 font-semibold text-white">
                              <span>{item.deviceName}</span>
                              {item.current && (
                                <span className="border border-white/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-white/60">
                              {formattedDate} at {formattedTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Secure Logout Card */}
            <div className="border border-white/15 bg-white/[0.02] p-6">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Session Protection
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">
                    Finished using Dezaakir on this device? Sign out securely to clear your active session cookie.
                  </p>
                  <button
                    type="button"
                    onClick={handleSecureLogout}
                    className="mt-4 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out Securely
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
