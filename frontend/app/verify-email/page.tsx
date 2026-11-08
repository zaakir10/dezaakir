"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api";

const VerifySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

type VerifyValues = z.infer<typeof VerifySchema>;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VerifyValues>({
    resolver: zodResolver(VerifySchema),
    defaultValues: { email: initialEmail, code: "" },
  });

  useEffect(() => {
    if (initialEmail) {
      setValue("email", initialEmail);
    }
  }, [initialEmail, setValue]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (values: VerifyValues) => {
    setServerError(null);
    setServerSuccess(null);
    try {
      const { data } = await apiRequest<{ message: string }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setServerSuccess(data.message);
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError("Verification failed. Please try again.");
      }
    }
  };

  const handleResend = async () => {
    const email = getValues("email").trim().toLowerCase();
    if (!email) {
      setServerError("Please enter your email address first.");
      return;
    }
    setServerError(null);
    setServerSuccess(null);
    setResending(true);
    try {
      const { data } = await apiRequest<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setServerSuccess(data.message);
      setCooldown(60);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to resend code right now.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/20 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex items-center gap-2 font-mono text-xs text-white/70 uppercase">
        <KeyRound className="h-4 w-4 text-white" />
        Email Verification (OTP)
      </div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Verify your email</h1>
      <p className="mt-2 text-sm text-white/70">
        Enter the 6-digit one-time code sent to your email address. Codes expire after 10 minutes.
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
          <label htmlFor="otp-email" className="block font-mono text-xs text-white uppercase">
            Email Address
          </label>
          <input
            id="otp-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white"
          />
          {errors.email && <p className="mt-1 text-xs text-white/80">· {errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="otp-code" className="block font-mono text-xs text-white uppercase">
            6-Digit Verification Code
          </label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            autoComplete="one-time-code"
            {...register("code")}
            className="mt-1.5 w-full rounded-md border border-white/25 bg-navy px-3.5 py-3 text-center font-mono text-xl tracking-[0.4em] text-white focus:border-white"
          />
          {errors.code && <p className="mt-1 text-xs text-white/80">· {errors.code.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-white/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Verifying..." : "Verify & Activate Account"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-5 text-xs">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="inline-flex items-center gap-1.5 font-medium text-white underline underline-offset-4 disabled:no-underline disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification code"}
        </button>

        <Link href="/login" className="text-white/70 hover:text-white">
          Back to Sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16 sm:py-24">
      <Suspense fallback={<div className="rounded-xl border border-white/20 p-8 text-sm text-white/70">Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
