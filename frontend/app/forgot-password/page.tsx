"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api";

const ForgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
});

type ForgotValues = z.infer<typeof ForgotSchema>;

export default function ForgotPasswordPage() {
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(ForgotSchema),
  });

  const onSubmit = async (values: ForgotValues) => {
    setServerError(null);
    setServerSuccess(null);
    try {
      const { data } = await apiRequest<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setServerSuccess(data.message);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to process request right now.");
      }
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16 sm:py-24">
      <div className="rounded-xl border border-white/20 bg-white/[0.03] p-6 sm:p-8">
        <div className="flex items-center gap-2 font-mono text-xs text-white/70 uppercase">
          <Mail className="h-4 w-4 text-white" />
          Account Recovery
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Forgot your password?</h1>
        <p className="mt-2 text-sm text-white/70">
          Enter your email address and we will send a single-use password reset link valid for 30 minutes.
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
          <div>
            <label htmlFor="forgot-email" className="block font-mono text-xs text-white uppercase">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white"
            />
            {errors.email && <p className="mt-1 text-xs text-white/80">· {errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-white/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Sending reset link..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 border-t border-white/15 pt-5 text-center text-xs text-white/70">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-white underline underline-offset-4">
            Back to Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
