"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiClientError, apiRequest } from "@/lib/api";
import type { SessionInfo, User } from "@/types";

const LoginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

function getSafeNextPath(): string {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("next") ?? params.get("redirect");
  if (candidate && candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, setAuthSession } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getSafeNextPath());
    }
  }, [loading, user, router]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    const payload = {
      email: values.email,
      password: values.password,
    };

    try {
      const { data } = await apiRequest<{
        user: User;
        session: SessionInfo;
        csrfToken: string;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuthSession({
        user: data.user,
        session: data.session,
        csrfToken: data.csrfToken,
      });

      const targetPath = getSafeNextPath();
      router.replace(targetPath);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
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
      <div className="border border-white/20 bg-white/[0.02] p-6 sm:p-10">
        <div className="flex items-center gap-2 font-mono text-xs text-white/70 uppercase">
          <Lock className="h-4 w-4 text-white" />
          Secure Session Sign-In
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Sign in to Dezaakir</h1>
        <p className="mt-2 text-sm text-white/70">
          Enter your verified email address and password.
        </p>

        {serverError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 border border-white bg-white/10 p-3.5 text-xs text-white"
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
              className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
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
              className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
            />
            {errors.password && <p className="mt-1 text-xs text-white/80">· {errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Signing in..." : "Sign In"}
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
