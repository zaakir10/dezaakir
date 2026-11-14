"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, LayoutDashboard, LogOut, Menu, User as UserIcon, X } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    router.push("/");
  };

  const isLinkActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || Boolean(pathname?.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-navy/92 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-6">
        {/* Original Dezaakir Brand Mark */}
        <Link
          href="/"
          className="group flex items-center gap-3 focus:outline-none"
          aria-label="Dezaakir Home"
        >
          <BrandLogo className="h-8 transition duration-200 group-hover:opacity-85" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-white">Dezaakir</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/50">
              Engineering · Dispatch
            </span>
          </div>
        </Link>

        {/* Desktop Editorial Navigation */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          {NAV_LINKS.map((item) => {
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative py-2 text-sm transition-colors duration-150 ${
                  active
                    ? "font-semibold text-white"
                    : "font-medium text-white/60 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 bottom-0 left-0 h-[2px] bg-white"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {!loading && user ? (
            <>
              <Link
                href={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : "/account"}
                className="inline-flex items-center gap-2 bg-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "Admin" : "Account"}</span>
              </Link>
              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <Link
                  href="/account"
                  className="inline-flex h-9 w-9 items-center justify-center border border-white/20 text-white/80 transition hover:border-white hover:text-white"
                  title={`Account (${user.name})`}
                  aria-label="Account Profile"
                >
                  <UserIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 w-9 items-center justify-center border border-white/20 text-white/70 transition hover:border-white hover:text-white"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-white/70 transition hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 bg-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <span>Collaborate</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle className="h-10 w-10" />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center border border-white/25 text-white transition hover:border-white"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-primary-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          id="mobile-primary-nav"
          className="border-t border-white/15 bg-navy px-6 py-6 md:hidden"
        >
          <nav className="flex flex-col divide-y divide-white/10" aria-label="Mobile navigation">
            {NAV_LINKS.map((item, idx) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between py-3.5 text-base transition ${
                    active ? "font-bold text-white" : "font-medium text-white/65 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-white/40">
                      0{idx + 1}
                    </span>
                    <span>{item.label}</span>
                  </span>
                  {active ? (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white">
                      Active
                    </span>
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-white/40" aria-hidden="true" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-white/15 pt-5">
            {user ? (
              <div className="flex flex-col gap-2.5">
                <Link
                  href={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : "/account"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-navy"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "Admin Console" : "Account Profile"}
                </Link>
                {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="border border-white/20 px-4 py-2.5 text-center font-mono text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    Profile ({user.name})
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="border border-white/20 px-4 py-2.5 text-center font-mono text-xs font-semibold uppercase tracking-wider text-white/75 hover:border-white hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="border border-white/25 px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="bg-white px-4 py-3 text-center font-mono text-xs font-bold uppercase tracking-wider text-navy"
                >
                  Contact
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
