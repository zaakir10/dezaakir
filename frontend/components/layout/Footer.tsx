import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/15 bg-navy text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Dezaakir Logo"
                width={36}
                height={36}
                className="h-9 w-auto object-contain"
              />
              <span className="text-lg font-semibold tracking-tight">Dezaakir</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              Full-Stack Developer, AI Engineer & Technology Publication. Focused on secure software architecture,
              modern TypeScript platforms, and technical writing.
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="font-mono text-xs font-semibold tracking-widest text-white uppercase">Navigation</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              <li>
                <Link href="/about" className="transition hover:text-white">
                  About & CV
                </Link>
              </li>
              <li>
                <Link href="/projects" className="transition hover:text-white">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/blog" className="transition hover:text-white">
                  Technology Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="font-mono text-xs font-semibold tracking-widest text-white uppercase">Platform & Security</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Built with Next.js App Router, Bun, Express, and MongoDB Atlas under OWASP ASVS Level 2 security
              verification standards.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium text-white/80">
              <Link href="/login" className="rounded border border-white/20 px-3 py-1.5 transition hover:bg-white hover:text-navy">
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded border border-white/20 px-3 py-1.5 transition hover:bg-white hover:text-navy"
              >
                Register
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/60 sm:flex-row sm:items-center">
          <p>© {year} Dezaakir. All rights reserved.</p>
          <p className="font-mono">Navy #0B1628 · White #FFFFFF</p>
        </div>
      </div>
    </footer>
  );
}
