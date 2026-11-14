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
    <header className="sticky top-0 z-40 border-b border-white/15 bg-navy/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        {/* Brand Identity */}
        <Link
          href="/"
          className="group flex items-center gap-3.5 focus:outline-none"
          aria-label="Dezaakir Home"
        >
          <BrandLogo className="h-9 transition duration-200 group-hover:opacity-90" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white">Dezaakir</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/55">
              Software & Technology
            </span>
          </div>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {NAV_LINKS.map((item) => {
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-4 py-2 text-sm font-medium transition duration-150 ${
                  active
                    ? "bg-white font-semibold text-navy"
                    : "text-white/75 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Authentication & Action Controls */}
        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />
          {!loading && user ? (
            <>
              <Link
                href={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : "/account"}
                className="inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "Dashboard" : "Profile"}
              </Link>
              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-2 text-xs font-medium text-white/85 transition hover:border-white hover:text-white"
                  title="Account Profile"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>{user.name.split(" ")[0]}</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-2 text-xs font-medium text-white/75 transition hover:border-white hover:text-white"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/85 transition hover:border-white hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <span>Start a Project</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Theme Toggle & Menu Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle className="h-[42px] w-[42px]" />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex items-center justify-center border border-white/25 p-2.5 text-white transition hover:border-white"
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
          <nav className="flex flex-col gap-1.5" aria-label="Mobile navigation">
            {NAV_LINKS.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white font-semibold text-navy"
                      : "border border-transparent text-white/80 hover:border-white/15 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] uppercase opacity-60">→</span>
                </Link>
              );
            })}

            <div className="my-3 h-px bg-white/15" />

            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : "/account"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-navy"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "Admin Dashboard" : "Account Profile"}
                </Link>
                {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="border border-white/20 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    Account Profile ({user.name})
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="border border-white/20 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white/80 hover:border-white hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="border border-white/25 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white"
                >
                  Login
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="bg-white px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-navy"
                >
                  Contact
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
