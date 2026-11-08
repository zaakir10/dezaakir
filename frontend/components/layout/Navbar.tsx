"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-navy/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Dezaakir Home">
          <Image
            src="/logo.png"
            alt="Dezaakir Logo"
            width={40}
            height={40}
            priority
            className="h-10 w-auto object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-white">Dezaakir</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {NAV_LINKS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
                  active ? "bg-white text-navy" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!loading && user ? (
            <>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-3.5 py-2 text-xs font-medium tracking-wide text-white transition hover:bg-white hover:text-navy"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3.5 py-2 text-xs font-medium text-white/90 transition hover:bg-white/10"
              >
                <UserIcon className="h-3.5 w-3.5" />
                {user.name.split(" ")[0]}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white hover:text-navy"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-white/90"
              >
                <ShieldCheck className="h-4 w-4" />
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-md border border-white/20 p-2 text-white md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/15 bg-navy px-6 py-5 md:hidden">
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {NAV_LINKS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3.5 py-2.5 text-sm font-medium transition ${
                    active ? "bg-white text-navy" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-white/15" />
            {user ? (
              <>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md border border-white/20 px-3.5 py-2.5 text-sm font-medium text-white"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-white/20 px-3.5 py-2.5 text-sm font-medium text-white"
                >
                  Account ({user.name})
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md bg-white px-3.5 py-2.5 text-left text-sm font-semibold text-navy"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-white/20 px-3.5 py-2.5 text-center text-sm font-medium text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-white px-3.5 py-2.5 text-center text-sm font-semibold text-navy"
                >
                  Create Account
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
