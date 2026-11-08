"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api";

const ResetSchema = z
  .object({
    token: z.string().trim().min(20, "Reset token is required"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .max(128)
      .regex(/[a-z]/, "Must include a lowercase letter")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[0-9]/, "Must include a number")
      .regex(/[^A-Za-z0-9]/, "Must include a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ResetValues = z.infer<typeof ResetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { token: tokenFromUrl, password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (tokenFromUrl) {
      setValue("token", tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  const onSubmit = async (values: ResetValues) => {
    setServerError(null);
    setServerSuccess(null);
    try {
      const { data } = await apiRequest<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setServerSuccess(data.message);
      setTimeout(() => router.push("/login"), 1400);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError("Password reset failed. Please request a new reset link.");
      }
    }
  };

  return (
    <div className="rounded-xl border border-white/20 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex items-center gap-2 font-mono text-xs text-white/70 uppercase">
        <KeyRound className="h-4 w-4 text-white" />
        Reset Password
      </div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Choose a new password</h1>
      <p className="mt-2 text-sm text-white/70">
        Resetting your password will immediately sign out all existing sessions on your account.
      </p>

      {serverSuccess && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-md border border-white bg-white/10 p-3.5 text-xs text-white"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverSuccess}</span>
        </div>
      )}

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
        {!tokenFromUrl && (
          <div>
            <label htmlFor="reset-token" className="block font-mono text-xs text-white uppercase">
              Reset Token
            </label>
            <input
              id="reset-token"
              type="text"
              {...register("token")}
              className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 font-mono text-xs text-white focus:border-white"
            />
            {errors.token && <p className="mt-1 text-xs text-white/80">· {errors.token.message}</p>}
          </div>
        )}

        <div>
          <label htmlFor="reset-password" className="block font-mono text-xs text-white uppercase">
            New Password
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white"
          />
          {errors.password && <p className="mt-1 text-xs text-white/80">· {errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="reset-confirm" className="block font-mono text-xs text-white uppercase">
            Confirm New Password
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-white/80">· {errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-white/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Updating password..." : "Reset Password"}
        </button>
      </form>

      <p className="mt-6 border-t border-white/15 pt-5 text-center text-xs text-white/70">
        <Link href="/login" className="font-semibold text-white underline underline-offset-4">
          Return to Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16 sm:py-24">
      <Suspense fallback={<div className="rounded-xl border border-white/20 p-8 text-sm text-white/70">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
