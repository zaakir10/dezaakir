"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4">
        <div className="border border-white/15 bg-white/[0.02] px-6 py-4 font-mono text-xs uppercase tracking-widest text-white/80">
          Verifying administrator session...
        </div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="border border-white/20 bg-white/[0.02] p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-white" />
          <h1 className="mt-4 text-xl font-bold text-white">Administrator Access Required</h1>
          <p className="mt-2 text-sm text-white/70">
            This control center is restricted to authenticated Dezaakir administrators.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-navy transition hover:bg-white/90"
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
