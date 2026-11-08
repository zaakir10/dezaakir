"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiClientError, apiRequest } from "@/lib/api";
import type { SessionInfo } from "@/types";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, refreshAuth, logout } = useAuth();

  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // MFA Setup State
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await apiRequest<{ sessions: SessionInfo[] }>("/api/auth/sessions");
      setSessions(data.sessions);
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      setName(user.name);
      void loadSessions();
    }
  }, [loading, user, router, loadSessions]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setProfileSaving(true);
    try {
      await apiRequest("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      await refreshAuth();
      setFeedback({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to update profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setPasswordSaving(true);
    try {
      const { data } = await apiRequest<{ message: string }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await loadSessions();
      setFeedback({ type: "success", text: data.message });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to change password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string, isCurrent?: boolean) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
      if (isCurrent) {
        await logout();
        router.push("/login");
        return;
      }
      await loadSessions();
      setFeedback({ type: "success", text: "Session revoked." });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to revoke session.",
      });
    }
  };

  const handleLogoutAll = async () => {
    setFeedback(null);
    try {
      await apiRequest("/api/auth/logout-all", { method: "POST" });
      await logout();
      router.push("/login");
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Failed to sign out all sessions.",
      });
    }
  };

  const handleStartMfaSetup = async () => {
    setFeedback(null);
    setMfaBusy(true);
    try {
      const { data } = await apiRequest<{ secret: string; otpauthUri: string }>("/api/auth/mfa/setup", {
        method: "POST",
      });
      setMfaSecret(data.secret);
      setMfaUri(data.otpauthUri);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Unable to start MFA setup.",
      });
    } finally {
      setMfaBusy(false);
    }
  };

  const handleEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setMfaBusy(true);
    try {
      const { data } = await apiRequest<{ recoveryCodes: string[] }>("/api/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ code: mfaCode.trim() }),
      });
      setRecoveryCodes(data.recoveryCodes);
      setMfaSecret(null);
      setMfaUri(null);
      setMfaCode("");
      await refreshAuth();
      setFeedback({
        type: "success",
        text: "Multi-factor authentication enabled. Save your recovery codes offline.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof ApiClientError ? err.message : "Invalid authenticator code.",
      });
    } finally {
      setMfaBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-24 text-center text-sm text-white/70">
        Loading account dashboard...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-8 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-xs tracking-widest text-white/60 uppercase">User Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{user.name}</h1>
          <p className="mt-1 font-mono text-xs text-white/70">
            {user.email} · Role: <span className="text-white">{user.role}</span>
          </p>
        </div>
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-xs font-semibold text-navy"
          >
            Open Admin Dashboard
          </Link>
        )}
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className="mt-6 flex items-start gap-2.5 rounded-md border border-white bg-white/10 p-4 text-xs text-white"
        >
          {feedback.type === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {/* Profile Form */}
        <section className="rounded-xl border border-white/20 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white uppercase">
            <UserIcon className="h-4 w-4" />
            Profile Information
          </div>
          <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
            <div>
              <label htmlFor="acc-name" className="block font-mono text-xs text-white/80 uppercase">
                Full Name
              </label>
              <input
                id="acc-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-white/60 uppercase">Verified Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white/60"
              />
            </div>
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-navy disabled:opacity-50"
            >
              {profileSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Profile
            </button>
          </form>
        </section>

        {/* Change Password Form */}
        <section className="rounded-xl border border-white/20 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white uppercase">
            <KeyRound className="h-4 w-4" />
            Change Password
          </div>
          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            <div>
              <label htmlFor="cur-pw" className="block font-mono text-xs text-white/80 uppercase">
                Current Password
              </label>
              <input
                id="cur-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="new-pw" className="block font-mono text-xs text-white/80 uppercase">
                New Password
              </label>
              <input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={10}
                className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="conf-pw" className="block font-mono text-xs text-white/80 uppercase">
                Confirm New Password
              </label>
              <input
                id="conf-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={10}
                className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-navy disabled:opacity-50"
            >
              {passwordSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Update Password
            </button>
          </form>
        </section>
      </div>

      {/* Multi-Factor Authentication (TOTP) */}
      <section className="mt-8 rounded-xl border border-white/20 bg-white/[0.03] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white uppercase">
              <ShieldCheck className="h-4 w-4" />
              Two-Factor Authentication (TOTP)
            </div>
            <p className="mt-1.5 text-xs text-white/70">
              {user.mfa?.enabled
                ? "Authenticator app (TOTP) is active on your account."
                : "Protect your account with an RFC 6238 authenticator app (required for Administrators)."}
            </p>
          </div>
          {!user.mfa?.enabled && !mfaSecret && (
            <button
              type="button"
              onClick={handleStartMfaSetup}
              disabled={mfaBusy}
              className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-navy"
            >
              Configure TOTP MFA
            </button>
          )}
        </div>

        {mfaSecret && (
          <form onSubmit={handleEnableMfa} className="mt-6 space-y-4 border-t border-white/15 pt-5">
            <p className="text-xs text-white/80">
              Add this Base32 secret key to your authenticator app (Google Authenticator, 1Password, Authy), then enter
              the 6-digit code below:
            </p>
            <div className="rounded border border-white/25 bg-navy p-3 font-mono text-xs break-all text-white">
              Secret: <strong>{mfaSecret}</strong>
              {mfaUri && <div className="mt-1 text-[11px] text-white/60">{mfaUri}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                className="rounded-md border border-white/25 bg-navy px-3.5 py-2 font-mono text-sm text-white"
              />
              <button
                type="submit"
                disabled={mfaBusy}
                className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-navy"
              >
                Verify & Enable MFA
              </button>
            </div>
          </form>
        )}

        {recoveryCodes && (
          <div className="mt-6 rounded-lg border border-white bg-navy p-4">
            <p className="font-mono text-xs font-semibold text-white uppercase">
              Single-Use Recovery Codes (Save Offline Now)
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-white sm:grid-cols-4">
              {recoveryCodes.map((c) => (
                <span key={c} className="rounded border border-white/20 bg-white/5 px-2.5 py-1.5 text-center">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Active Sessions */}
      <section className="mt-8 rounded-xl border border-white/20 bg-white/[0.03] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white uppercase">
            <Laptop className="h-4 w-4" />
            Active Sessions ({sessions.length})
          </div>
          <button
            type="button"
            onClick={handleLogoutAll}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/25 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white hover:text-navy"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out All Devices
          </button>
        </div>

        <div className="mt-5 divide-y divide-white/10">
          {sessionsLoading ? (
            <p className="py-4 text-xs text-white/60">Loading sessions...</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-3.5 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-medium text-white">
                    <span>{s.userAgent ? s.userAgent.slice(0, 72) : "Browser Session"}</span>
                    {s.current && (
                      <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-navy">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-white/60">
                    IP: {s.ip || "local"} · Expires: {new Date(s.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeSession(s.id, s.current)}
                  className="inline-flex items-center gap-1 rounded border border-white/20 px-2.5 py-1.5 text-white/80 hover:bg-white hover:text-navy"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
