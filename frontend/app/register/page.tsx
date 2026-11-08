"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api";

const RegisterFormSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
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

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError("Registration failed. Please try again.");
      }
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16 sm:py-24">
      <div className="border border-white/20 bg-white/[0.02] p-6 sm:p-10">
        <div className="flex items-center gap-2 font-mono text-xs text-white/70 uppercase">
          <ShieldCheck className="h-4 w-4 text-white" />
          Account Registration
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Create your account</h1>
        <p className="mt-2 text-sm text-white/70">
          We will send a 6-digit verification code to your email before activating your account.
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
            <label htmlFor="reg-name" className="block font-mono text-xs text-white uppercase">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              {...register("name")}
              className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
            />
            {errors.name && <p className="mt-1 text-xs text-white/80">· {errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="block font-mono text-xs text-white uppercase">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
            />
            {errors.email && <p className="mt-1 text-xs text-white/80">· {errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-password" className="block font-mono text-xs text-white uppercase">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
            />
            {errors.password && <p className="mt-1 text-xs text-white/80">· {errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-confirm" className="block font-mono text-xs text-white uppercase">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className="mt-1.5 w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-white/80">· {errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating account..." : "Register & Send OTP"}
          </button>
        </form>

        <p className="mt-6 border-t border-white/15 pt-5 text-center text-xs text-white/70">
          Already have a verified account?{" "}
          <Link href="/login" className="font-semibold text-white underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
