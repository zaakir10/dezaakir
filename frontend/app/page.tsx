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
  if (lower.includes("net") || lower.includes("infra") || lower.includes("cloud") || lower.includes("sec"))
    return "Infrastructure";
  if (lower.includes("tool") || lower.includes("ai")) return "AI & Developer Tools";
  return rawCategory || "Engineering";
}

export default async function HomePage() {
  const [settings, featuredRes, allProjectsRes, { blogs }] = await Promise.all([
    fetchPublicSettings(),
    fetchPublicProjects({ featured: true, limit: 4 }),
    fetchPublicProjects({ limit: 4 }),
    fetchPublicBlogs({ limit: 3 }),
  ]);

  const projects =
    featuredRes.projects.length > 0 ? featuredRes.projects : allProjectsRes.projects;
  const leadProject = projects[0];
  const secondaryProjects = projects.slice(1, 3);

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
      {/* 1. EDITORIAL HERO COMPOSITION                                     */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28 lg:py-32">
          <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Primary Editorial Statement */}
            <div className="min-w-0 lg:col-span-8">
              <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
                <span>{settings.authorName || settings.siteTitle || "Dezaakir"}</span>
                <span className="text-white/25">/</span>
                <span>Full-Stack Software Engineer</span>
                {settings.location && (
                  <>
                    <span className="text-white/25">/</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {settings.location}
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-7 text-4xl font-bold leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
                {settings.heroTitle || "Building Digital Experiences Through Code & Technology."}
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/75 sm:text-xl sm:leading-relaxed">
                {settings.heroDescription ||
                  "I'm a software developer passionate about building modern web applications, solving real-world problems, and exploring emerging technologies."}
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2.5 bg-white px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <span>Explore Projects</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2.5 border border-white/30 px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>Contact Me</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Verified Portrait or Typographic Emblem */}
            <div className="min-w-0 lg:col-span-4">
              <div className="border border-white/20 bg-navy">
                <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                  <span>{settings.siteTitle || "Dezaakir"}</span>
                  <span>Portfolio · Journal</span>
                </div>

                {settings.profileImage?.url ? (
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-navy">
                    <Image
                      src={settings.profileImage.url}
                      alt={settings.profileImage.alt || "Dezaakir"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 380px"
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] w-full flex-col justify-between p-8">
                    <div className="flex items-start justify-between">
                      <BrandLogo className="h-14" label="Dezaakir Official Emblem" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                        EST. DEV
                      </span>
                    </div>

                    <div className="space-y-4 border-t border-white/15 pt-6">
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/55">
                        Focus Areas
                      </p>
                      <p className="text-lg font-semibold leading-snug text-white">
                        {settings.tagline || "Web Architecture, TypeScript Systems & AI Engineering"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(settings.careerInterests ?? []).slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/75"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Bar */}
                <div className="flex flex-wrap items-center gap-2 border-t border-white/15 px-5 py-3.5">
                  {socialLinksList.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-white/70 transition hover:text-white"
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. FEATURED ENGINEERING WORK                                      */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <MotionReveal>
            <div className="flex flex-col justify-between gap-6 border-b border-white/15 pb-8 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  01 · Selected Engineering Work
                </p>
                <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Featured Projects
                </h2>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white/80 transition hover:text-white"
              >
                <span>All Case Studies</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </MotionReveal>

          {leadProject ? (
            <div className="mt-10 space-y-8">
              <MotionReveal>
                <ProjectCard project={leadProject} index={0} variant="editorial" />
              </MotionReveal>

              {secondaryProjects.length > 0 && (
                <div className="grid gap-8 md:grid-cols-2">
                  {secondaryProjects.map((project, idx) => (
                    <MotionReveal key={project.id} delay={idx * 0.08}>
                      <ProjectCard project={project} index={idx + 1} />
                    </MotionReveal>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-10 border border-white/15 p-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
                Engineering Archive
              </p>
              <p className="mt-2 text-base text-white/75">
                Published engineering case studies will appear here as soon as they are released.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. ABOUT PREVIEW — EDITORIAL INTRODUCTION                         */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <MotionReveal>
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  02 · Engineering Profile
                </p>
                <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Craft, Reliability &amp; Clarity.
                </h2>
                <Link
                  href="/about"
                  className="mt-7 inline-flex items-center gap-2 border-b border-white/40 pb-1 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white"
                >
                  <span>Read Full Biography</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              <div className="space-y-6 lg:col-span-8">
                <div className="space-y-4 border-l-2 border-white/30 pl-6 text-base leading-relaxed text-white/80 sm:text-lg">
                  {biographyParagraphs.slice(0, 2).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                {settings.careerInterests && settings.careerInterests.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
                      Specialties:
                    </span>
                    {settings.careerInterests.map((interest) => (
                      <span
                        key={interest}
                        className="border border-white/15 px-3 py-1 font-mono text-xs text-white/80"
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
      {/* 4. TECHNICAL EXPERTISE — SPECIFICATION MATRIX                     */}
      {/* ================================================================= */}
      {Object.keys(skillsByDiscipline).length > 0 && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <MotionReveal>
              <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-8 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                    03 · Technical Expertise
                  </p>
                  <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Stack &amp; Engineering Disciplines
                  </h2>
                </div>
                <p className="max-w-sm text-sm text-white/60">
                  Production technologies organized by architectural layer and daily engineering practice.
                </p>
              </div>

              <div className="divide-y divide-white/15 border-b border-white/15">
                {Object.entries(skillsByDiscipline).map(([discipline, items], idx) => (
                  <div
                    key={discipline}
                    className="grid items-baseline gap-4 py-6 md:grid-cols-12"
                  >
                    <div className="flex items-baseline gap-4 md:col-span-4">
                      <span className="font-mono text-xs text-white/40">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-base font-bold tracking-tight text-white">
                        {discipline}
                      </h3>
                    </div>
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
      {/* 5. LATEST ARTICLES — EDITORIAL PUBLICATION PREVIEW                */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <MotionReveal>
            <div className="flex flex-col justify-between gap-6 border-b border-white/15 pb-8 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  04 · Technology Publication
                </p>
                <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Latest Dispatches
                </h2>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white/80 transition hover:text-white"
              >
                <span>Open Magazine</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </MotionReveal>

          {blogs.length > 0 ? (
            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((article, idx) => (
                <MotionReveal key={article.id} delay={idx * 0.08}>
                  <BlogCard article={article} />
                </MotionReveal>
              ))}
            </div>
          ) : (
            <div className="mt-10 border border-white/15 p-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
                Editorial Desk
              </p>
              <p className="mt-2 text-base text-white/75">
                New technical articles and architecture breakdowns are in preparation.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. COLLABORATION CTA                                              */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <MotionReveal>
            <div className="flex flex-col items-start justify-between gap-8 border border-white/20 bg-navy p-8 sm:p-12 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                  05 · Available for Collaboration
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Have an ambitious product or engineering challenge?
                </h2>
                <p className="mt-3 text-base leading-relaxed text-white/75">
                  Let&apos;s discuss full-stack architecture, modern web applications, or technical
                  collaboration.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-white px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <span>Start a Conversation</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>
    </main>
  );
}
