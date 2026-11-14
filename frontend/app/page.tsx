import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { fetchPublicBlogs, fetchPublicProjects, fetchPublicSettings } from "@/lib/api";
import { siteConfig } from "@/lib/site";

function normalizeDiscipline(rawCategory: string): string {
  const lower = rawCategory.toLowerCase();
  if (lower.includes("front")) return "Frontend";
  if (lower.includes("back") || lower.includes("api")) return "Backend";
  if (lower.includes("data") || lower.includes("sql") || lower.includes("mongo")) return "Databases";
  if (lower.includes("lang")) return "Programming Languages";
  if (
    lower.includes("net") ||
    lower.includes("infra") ||
    lower.includes("cloud") ||
    lower.includes("sec")
  ) {
    return "Infrastructure";
  }
  if (lower.includes("tool") || lower.includes("ai")) return "AI & Developer Tools";
  return rawCategory || "Engineering";
}

export default async function HomePage() {
  const [settings, featuredRes, allProjectsRes, { blogs }] = await Promise.all([
    fetchPublicSettings(),
    fetchPublicProjects({ featured: true, limit: 3 }),
    fetchPublicProjects({ limit: 3 }),
    fetchPublicBlogs({ limit: 3 }),
  ]);

  const projects = (
    featuredRes.projects.length > 0 ? featuredRes.projects : allProjectsRes.projects
  ).slice(0, 3);

  const skillsByDiscipline = settings.skills.reduce<Record<string, string[]>>((acc, skill) => {
    const key = normalizeDiscipline(skill.category);
    if (!acc[key]) acc[key] = [];
    if (!acc[key]!.includes(skill.name)) {
      acc[key]!.push(skill.name);
    }
    return acc;
  }, {});

  const social = settings.socialLinks || {};
  const socialLinksList = [
    { label: "GitHub", href: social.github || "https://github.com/zaakir10" },
    ...(social.linkedin ? [{ label: "LinkedIn", href: social.linkedin }] : []),
    ...(social.x ? [{ label: "X / Twitter", href: social.x }] : []),
    ...(social.facebook ? [{ label: "Facebook", href: social.facebook }] : []),
    ...(social.tiktok ? [{ label: "TikTok", href: social.tiktok }] : []),
  ];

  const biographyParagraphs = settings.biography
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.authorName || settings.siteTitle || "Dezaakir",
    url: siteConfig.url,
    jobTitle: "Full-Stack Software Developer",
    description: settings.heroDescription,
  };

  return (
    <main className="bg-navy text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ================================================================= */}
      {/* 1. HERO SECTION                                                   */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
            {/* Developer Introduction & CTAs */}
            <div className="min-w-0 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-white/60">
                <span>{settings.authorName || settings.siteTitle || "Dezaakir"}</span>
                <span aria-hidden="true" className="text-white/25">
                  /
                </span>
                <span>Full-Stack Software Developer</span>
                {settings.location && (
                  <>
                    <span aria-hidden="true" className="text-white/25">
                      /
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {settings.location}
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {settings.heroTitle || "Building Digital Experiences Through Code & Technology."}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                {settings.heroDescription ||
                  "I'm a software developer passionate about building modern web applications, solving real-world problems, and exploring emerging technologies."}
              </p>

              {/* Primary & Secondary CTA Buttons */}
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2.5 bg-white px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <span>View Projects</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2.5 border border-white/30 px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>Contact Me</span>
                </Link>
              </div>

              {/* Social Links */}
              <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-6">
                {socialLinksList.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-white/65 transition hover:text-white"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            {/* Clean Visual Representation */}
            <div className="min-w-0 lg:col-span-5">
              <div className="border border-white/20 bg-navy">
                {settings.profileImage?.url ? (
                  <div className="relative aspect-[4/4] w-full overflow-hidden bg-navy">
                    <Image
                      src={settings.profileImage.url}
                      alt={settings.profileImage.alt || settings.authorName || "Dezaakir"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 440px"
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex flex-col justify-between p-8 sm:p-10">
                    <div className="flex items-center justify-between border-b border-white/15 pb-6">
                      <BrandLogo className="h-12" label="Dezaakir Logo" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                        Portfolio
                      </span>
                    </div>

                    <div className="py-8">
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                        Core Focus
                      </p>
                      <p className="mt-3 text-xl font-semibold leading-snug text-white">
                        {settings.tagline ||
                          "Full-Stack Engineering, Modern Web Architecture & AI"}
                      </p>
                    </div>

                    {settings.careerInterests && settings.careerInterests.length > 0 && (
                      <div className="flex flex-wrap gap-2 border-t border-white/15 pt-6">
                        {settings.careerInterests.slice(0, 4).map((item) => (
                          <span
                            key={item}
                            className="border border-white/15 px-3 py-1 font-mono text-[11px] text-white/80"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. ABOUT PREVIEW                                                  */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <MotionReveal>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
              <div className="min-w-0 lg:col-span-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  About
                </p>
                <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Engineering with Clarity &amp; Purpose.
                </h2>
                <div className="mt-7">
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
                  >
                    <span>About Me</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="min-w-0 space-y-5 lg:col-span-8">
                <div className="space-y-4 border-l-2 border-white/30 pl-6 text-base leading-relaxed text-white/80 sm:text-lg">
                  {biographyParagraphs.slice(0, 2).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                {settings.careerInterests && settings.careerInterests.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {settings.careerInterests.map((interest) => (
                      <span
                        key={interest}
                        className="border border-white/15 px-3 py-1 font-mono text-xs text-white/75"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. FEATURED PROJECTS                                              */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <MotionReveal>
            <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-7 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  Selected Work
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Featured Projects
                </h2>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white/80 transition hover:text-white"
              >
                <span>View All Projects</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </MotionReveal>

          {projects.length > 0 ? (
            <>
              <div className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, idx) => (
                  <MotionReveal key={project.id} delay={idx * 0.05}>
                    <ProjectCard project={project} />
                  </MotionReveal>
                ))}
              </div>

              <div className="mt-10 flex justify-center sm:justify-start">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 border border-white/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>View All Projects</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-10 border border-white/15 p-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
                Engineering Portfolio
              </p>
              <p className="mt-2 text-base text-white/75">
                Published projects will appear here once released.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. LATEST BLOG POSTS                                              */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <MotionReveal>
            <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-7 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  Publication
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Latest Blog Posts
                </h2>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white/80 transition hover:text-white"
              >
                <span>View All Articles</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </MotionReveal>

          {blogs.length > 0 ? (
            <>
              <div className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
                {blogs.map((article, idx) => (
                  <MotionReveal key={article.id} delay={idx * 0.05}>
                    <BlogCard article={article} />
                  </MotionReveal>
                ))}
              </div>

              <div className="mt-10 flex justify-center sm:justify-start">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 border border-white/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>View All Articles</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-10 border border-white/15 p-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
                Editorial Desk
              </p>
              <p className="mt-2 text-base text-white/75">
                Published technical articles will appear here soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. SKILLS & TECHNOLOGIES                                          */}
      {/* ================================================================= */}
      {Object.keys(skillsByDiscipline).length > 0 && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
            <MotionReveal>
              <div className="border-b border-white/15 pb-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  Capabilities
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Skills &amp; Technologies
                </h2>
              </div>

              <div className="divide-y divide-white/15 border-b border-white/15">
                {Object.entries(skillsByDiscipline).map(([discipline, items]) => (
                  <div
                    key={discipline}
                    className="grid items-baseline gap-4 py-6 md:grid-cols-12"
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/85 md:col-span-4">
                      {discipline}
                    </h3>
                    <div className="flex flex-wrap gap-2 md:col-span-8">
                      {items.map((tech) => (
                        <span
                          key={tech}
                          className="border border-white/15 bg-white/[0.02] px-3 py-1 font-mono text-xs text-white/85"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 6. CONTACT CTA                                                    */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <MotionReveal>
            <div className="flex flex-col items-start justify-between gap-8 border border-white/20 bg-navy p-8 sm:p-12 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                  Get in Touch
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Let&apos;s build your next web application.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-white/75">
                  Available for full-stack software development, technical consulting, and
                  collaborative engineering projects.
                </p>
              </div>

              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center gap-2 bg-white px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <span>Contact Me</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>
    </main>
  );
}
