"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useAuth } from "@/features/auth/AuthContext";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-navy px-4 text-white">
        <div className="flex flex-col items-center border border-white/20 bg-white/[0.02] px-8 py-6">
          <BrandLogo className="h-10" />
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-white/80">
            Verifying Dezaakir Administrator Session...
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-navy px-4 text-center text-white">
        <div className="max-w-md border border-white/25 bg-white/[0.02] p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-white" />
          <h1 className="mt-4 text-xl font-bold text-white">Administrator Access Required</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            The Dezaakir Administration Console is restricted to authenticated administrators with
            verified RBAC privileges.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
            >
              Admin Sign In
            </Link>
            <Link
              href="/"
              className="border border-white/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}
