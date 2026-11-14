"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Mail, MapPin } from "lucide-react";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
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
    { label: "GitHub", href: social.github || "https://github.com/zaakir10" },
    ...(social.linkedin ? [{ label: "LinkedIn", href: social.linkedin }] : []),
    ...(social.x ? [{ label: "X / Twitter", href: social.x }] : []),
    ...(social.facebook ? [{ label: "Facebook", href: social.facebook }] : []),
    ...(social.tiktok ? [{ label: "TikTok", href: social.tiktok }] : []),
  ];

  return (
    <footer className="border-t border-white/15 bg-navy text-white">
      {/* Main Editorial Footer Directory */}
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* 1. Brand & Positioning */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3.5">
              <BrandLogo className="h-9" />
              <div>
                <span className="block text-lg font-bold tracking-tight text-white">
                  {settings.siteTitle || "Dezaakir"}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Software Engineering & Publication
                </span>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
              Independent developer portfolio and technology publication dedicated to resilient web
              architecture, full-stack TypeScript systems, and thoughtful software craft.
            </p>

            {/* Social Links */}
            <div className="mt-7 flex flex-wrap gap-2">
              {socialEntries.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 border border-white/15 px-3 py-1.5 font-mono text-[11px] text-white/75 transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* 2. Navigation */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
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

          {/* 3. Selected Work & Dispatches */}
          <div className="lg:col-span-3">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
              {featuredProjects.length > 0 ? "Selected Work" : "Publication"}
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-white/75">
              {featuredProjects.length > 0 ? (
                featuredProjects.map((proj) => (
                  <li key={proj.id}>
                    <Link
                      href={`/projects/${proj.slug}`}
                      className="line-clamp-1 transition hover:text-white"
                    >
                      {proj.title}
                    </Link>
                  </li>
                ))
              ) : latestBlogs.length > 0 ? (
                latestBlogs.map((blog) => (
                  <li key={blog.id}>
                    <Link
                      href={`/blog/${blog.slug}`}
                      className="line-clamp-1 transition hover:text-white"
                    >
                      {blog.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link href="/projects" className="transition hover:text-white">
                      Engineering Archive
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="transition hover:text-white">
                      Technology Magazine
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* 4. Direct Contact */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
              Connect
            </h3>
            <div className="mt-5 space-y-3 text-sm text-white/75">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
                <span>{settings.location || "Remote · Global"}</span>
              </div>
              {social.email && (
                <a
                  href={`mailto:${social.email}`}
                  className="flex items-center gap-2 break-all transition hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
                  <span>{social.email}</span>
                </a>
              )}
              <div className="pt-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 border-b border-white/40 pb-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
                >
                  <span>Start a Conversation</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Back-to-Top Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-white/50">
            <span>© {year} Dezaakir. All rights reserved.</span>
            <span>Strict Navy (#0B1628) &amp; White (#FFFFFF) Identity</span>
          </div>
          <BackToTopButton />
        </div>
      </div>
    </footer>
  );
}
