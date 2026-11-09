"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Mail, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { DEFAULT_SITE_SETTINGS } from "@/lib/api";
import { siteConfig } from "@/lib/site";
import type { BlogArticle, ProjectItem, SiteSettingsData } from "@/types";

export function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  const [settings, setSettings] = useState<SiteSettingsData>(DEFAULT_SITE_SETTINGS);
  const [latestBlogs, setLatestBlogs] = useState<BlogArticle[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<ProjectItem[]>([]);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    let active = true;

    const loadFooterData = async () => {
      try {
        const [setRes, blogRes, projRes] = await Promise.all([
          fetch(`${siteConfig.apiUrl}/api/settings`),
          fetch(`${siteConfig.apiUrl}/api/blogs?limit=3`),
          fetch(`${siteConfig.apiUrl}/api/projects?featured=true&limit=3`),
        ]);
        if (!active) return;

        if (setRes.ok) {
          const json = (await setRes.json()) as {
            data?: { settings?: Partial<SiteSettingsData> };
          };
          if (json.data?.settings) {
            setSettings((prev) => ({
              ...prev,
              ...json.data!.settings,
              socialLinks: {
                ...prev.socialLinks,
                ...(json.data!.settings?.socialLinks ?? {}),
              },
            }));
          }
        }

        if (blogRes.ok) {
          const json = (await blogRes.json()) as { data?: { blogs?: BlogArticle[] } };
          setLatestBlogs(json.data?.blogs ?? []);
        }

        if (projRes.ok) {
          const json = (await projRes.json()) as { data?: { projects?: ProjectItem[] } };
          setFeaturedProjects(json.data?.projects ?? []);
        }
      } catch {
        // Gracefully keep default links if backend is unreachable
      }
    };

    void loadFooterData();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const social = settings.socialLinks || {};
  const socialEntries = [
    { label: "GitHub", href: social.github || "https://github.com/dezaakir" },
    { label: "Facebook", href: social.facebook || "https://facebook.com/dezaakir" },
    { label: "TikTok", href: social.tiktok || "https://tiktok.com/@dezaakir" },
    ...(social.linkedin ? [{ label: "LinkedIn", href: social.linkedin }] : []),
    ...(social.x ? [{ label: "X / Twitter", href: social.x }] : []),
  ];

  return (
    <footer className="border-t border-white/15 bg-navy text-white">
      {/* Upper Architectural Callout Bar */}
      <div className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/60">
              Engineering & Collaboration
            </p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Building Digital Experiences Through Code & Technology.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/projects"
              className="border border-white/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
            >
              View Portfolio
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
            >
              <span>Get in Touch</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main 4-Column Editorial Footer Grid */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* 1. Brand Section */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-3.5">
              <BrandLogo className="h-9" />
              <div>
                <span className="block text-lg font-bold tracking-tight text-white">
                  {settings.siteTitle || "Dezaakir"}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-white/55">
                  Developer Portfolio & Publication
                </span>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              Software developer focused on building modern web applications, solving real-world
              engineering problems, and publishing in-depth technical articles.
            </p>

            {/* Social Media Links Bar */}
            <div className="mt-6 flex flex-wrap gap-2">
              {socialEntries.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 border border-white/20 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] text-white/80 transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>

          {/* 2. Quick Navigation */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white">
              Navigation
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-white/75">
              <li>
                <Link href="/" className="transition hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/projects" className="transition hover:text-white">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/blog" className="transition hover:text-white">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Explore (Latest Articles, Featured Projects, Technical Topics) */}
          <div className="lg:col-span-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white">
              Explore
            </h3>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                  Latest Articles
                </p>
                <ul className="mt-2 space-y-1.5 text-white/75">
                  {latestBlogs.length > 0 ? (
                    latestBlogs.slice(0, 2).map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/blog/${b.slug}`}
                          className="line-clamp-1 text-xs transition hover:text-white"
                        >
                          → {b.title}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li>
                      <Link href="/blog" className="text-xs transition hover:text-white">
                        → Browse Technology Magazine
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                  Featured Projects
                </p>
                <ul className="mt-2 space-y-1.5 text-white/75">
                  {featuredProjects.length > 0 ? (
                    featuredProjects.slice(0, 2).map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/projects/${p.slug}`}
                          className="line-clamp-1 text-xs transition hover:text-white"
                        >
                          → {p.title}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li>
                      <Link href="/projects" className="text-xs transition hover:text-white">
                        → Explore Engineering Portfolio
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                  Technical Topics
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <Link
                    href="/blog"
                    className="border border-white/15 px-2 py-0.5 text-white/75 transition hover:border-white hover:text-white"
                  >
                    Full-Stack
                  </Link>
                  <Link
                    href="/blog"
                    className="border border-white/15 px-2 py-0.5 text-white/75 transition hover:border-white hover:text-white"
                  >
                    TypeScript
                  </Link>
                  <Link
                    href="/blog"
                    className="border border-white/15 px-2 py-0.5 text-white/75 transition hover:border-white hover:text-white"
                  >
                    Architecture
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Contact & Direct Channels */}
          <div className="lg:col-span-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white">
              Contact & Channels
            </h3>
            <div className="mt-5 space-y-3.5 text-sm text-white/75">
              {social.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                  <a
                    href={`mailto:${social.email}`}
                    className="break-all font-mono text-xs text-white underline underline-offset-4"
                  >
                    {social.email}
                  </a>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                <span className="text-xs text-white/80">
                  {settings.location || "Remote · Global"}
                </span>
              </div>

              <ul className="space-y-2 border-t border-white/10 pt-3 font-mono text-xs">
                <li>
                  <a
                    href={social.github || "https://github.com/dezaakir"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-white/75 transition hover:text-white"
                  >
                    <span>GitHub</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    href={social.facebook || "https://facebook.com/dezaakir"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-white/75 transition hover:text-white"
                  >
                    <span>Facebook</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    href={social.tiktok || "https://tiktok.com/@dezaakir"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-white/75 transition hover:text-white"
                  >
                    <span>TikTok</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 text-white underline underline-offset-4"
                  >
                    <span>Direct Contact Form</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Attribution Bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/15 pt-8 text-xs text-white/60 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p>© {year} Dezaakir. All rights reserved.</p>
            <span className="hidden text-white/30 sm:inline">·</span>
            <p className="font-medium text-white/80">Designed & Developed by Dezaakir</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
            <Link href="/sitemap.xml" className="transition hover:text-white">
              Sitemap
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
