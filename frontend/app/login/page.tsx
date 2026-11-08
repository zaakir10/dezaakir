"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, KeyRound, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiClientError, apiRequest } from "@/lib/api";
import type { SessionInfo, User } from "@/types";

const LoginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(128),
  totpCode: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuthSession } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [mfaStep, setMfaStep] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: "", password: "", totpCode: "", recoveryCode: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    const payload: Record<string, string> = {
      email: values.email,
      password: values.password,
    };
    if (mfaStep) {
      if (useRecovery && values.recoveryCode?.trim()) {
        payload.recoveryCode = values.recoveryCode.trim();
      } else if (values.totpCode?.trim()) {
        payload.totpCode = values.totpCode.trim();
      }
    }

    try {
      const { data } = await apiRequest<{
        user: User;
        session: SessionInfo;
        csrfToken: string;
        mfaEnrollmentRequired?: boolean;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuthSession({
        user: data.user,
        session: data.session,
        csrfToken: data.csrfToken,
      });

      if (data.mfaEnrollmentRequired) {
        router.push("/account?setupMfa=1");
      } else if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "MFA_REQUIRED") {
          setMfaStep(true);
          setServerError("Enter your 6-digit authenticator code to complete administrator sign-in.");
          return;
        }
        if (err.code === "EMAIL_NOT_VERIFIED") {
          const email = getValues("email");
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setServerError(err.message);
      } else {
        setServerError("Unable to sign in right now. Please try again.");
      }
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16 sm:py-24">
      <div className="rounded-xl border border-white/20 bg-white/[0.03] p-6 sm:p-8">
        <div className="flex items-center gap-2 font-mono text-xs text-white/70 uppercase">
          <Lock className="h-4 w-4 text-white" />
          Secure Session Sign-In
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Sign in to Dezaakir</h1>
        <p className="mt-2 text-sm text-white/70">
          {mfaStep
            ? "Multi-factor authentication is required for this account."
            : "Enter your verified email address and password."}
        </p>

        {serverError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-md border border-white bg-white/5 p-3.5 text-xs text-white"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
          <div>
            <label htmlFor="login-email" className="block font-mono text-xs text-white uppercase">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white"
            />
            {errors.email && <p className="mt-1 text-xs text-white/80">· {errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block font-mono text-xs text-white uppercase">
                Password
              </label>
              <Link href="/forgot-password" className="font-mono text-xs text-white/70 hover:text-white">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white"
            />
            {errors.password && <p className="mt-1 text-xs text-white/80">· {errors.password.message}</p>}
          </div>

          {mfaStep && (
            <div className="rounded-lg border border-white/25 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <label htmlFor="login-mfa" className="flex items-center gap-1.5 font-mono text-xs text-white uppercase">
                  <KeyRound className="h-3.5 w-3.5" />
                  {useRecovery ? "Recovery Code" : "Authenticator Code (TOTP)"}
                </label>
                <button
                  type="button"
                  onClick={() => setUseRecovery((p) => !p)}
                  className="font-mono text-[11px] text-white/75 underline"
                >
                  {useRecovery ? "Use 6-digit TOTP" : "Use recovery code"}
                </button>
              </div>

              {useRecovery ? (
                <input
                  id="login-mfa"
                  type="text"
                  placeholder="XXXX-XXXX"
                  {...register("recoveryCode")}
                  className="mt-2 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 font-mono text-sm text-white uppercase focus:border-white"
                />
              ) : (
                <input
                  id="login-mfa"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  {...register("totpCode")}
                  className="mt-2 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-white focus:border-white"
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-white/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Signing in..." : mfaStep ? "Verify MFA & Sign In" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/70">
          <Link href="/register" className="font-semibold text-white underline underline-offset-4">
            Create an account
          </Link>
          <Link href="/verify-email" className="hover:text-white">
            Verify pending email
          </Link>
        </div>
      </div>
    </main>
  );
}
