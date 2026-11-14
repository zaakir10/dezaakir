import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Download, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { fetchPublicSettings } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Professional biography, software engineering journey, education, technical expertise, and engineering philosophy of Dezaakir.",
  alternates: { canonical: `${siteConfig.url}/about` },
};

const CORE_SKILL_DOMAINS = [
  "Frontend",
  "Backend",
  "Databases",
  "Programming Languages",
  "Infrastructure",
  "AI & Developer Tools",
] as const;

const ENGINEERING_PHILOSOPHY = [
  {
    index: "01",
    title: "Problem Solving First",
    description:
      "Breaking complex operational and product requirements into clear, maintainable software architectures that solve real-world problems.",
  },
  {
    index: "02",
    title: "Scalable Systems",
    description:
      "Designing modular backend APIs, indexed data models, and resilient frontend applications built to perform reliably in production.",
  },
  {
    index: "03",
    title: "Clean, Strict Code",
    description:
      "Writing strongly typed TypeScript with predictable state boundaries, thorough validation, and clear separation of concerns.",
  },
  {
    index: "04",
    title: "Continuous Learning",
    description:
      "Staying deeply engaged with modern runtime engines, web standards, security best practices, and emerging developer tools.",
  },
  {
    index: "05",
    title: "Purposeful Innovation",
    description:
      "Applying modern full-stack frameworks, automation, and AI thoughtfully to deliver faster, more dependable digital products.",
  },
] as const;

function normalizeSkillDomain(rawCategory: string): string {
  const lower = rawCategory.toLowerCase();
  if (lower.includes("front")) return "Frontend";
  if (lower.includes("back") || lower.includes("api")) return "Backend";
  if (lower.includes("data") || lower.includes("sql") || lower.includes("mongo"))
    return "Databases";
  if (lower.includes("lang")) return "Programming Languages";
  if (
    lower.includes("net") ||
    lower.includes("infra") ||
    lower.includes("cloud") ||
    lower.includes("sec")
  )
    return "Infrastructure";
  if (lower.includes("tool") || lower.includes("ai")) return "AI & Developer Tools";
  return rawCategory || "AI & Developer Tools";
}

function formatTimelineDate(raw?: string): string {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export default async function AboutPage() {
  const settings = await fetchPublicSettings();
  const cvHref = settings.cvUrl || "/dezaakir-cv.pdf";

  const groupedSkills: Record<string, string[]> = {};
  for (const domain of CORE_SKILL_DOMAINS) {
    groupedSkills[domain] = [];
  }
  for (const item of settings.skills) {
    const bucket = normalizeSkillDomain(item.category);
    if (!groupedSkills[bucket]) groupedSkills[bucket] = [];
    if (!groupedSkills[bucket]!.includes(item.name)) {
      groupedSkills[bucket]!.push(item.name);
    }
  }
  const activeSkillDomains = Object.entries(groupedSkills).filter(([, list]) => list.length > 0);

  const biographyParagraphs = settings.biography
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="bg-navy text-white">
      {/* ================================================================= */}
      {/* 1. EDITORIAL BIOGRAPHY MASTHEAD                                   */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                <span>Profile &amp; Biography</span>
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

              <h1 className="mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-6xl">
                {settings.authorName || settings.siteTitle || "Dezaakir"}
              </h1>

              {settings.tagline && (
                <p className="mt-4 font-mono text-sm text-white/70">{settings.tagline}</p>
              )}

              <div className="mt-9 space-y-5 text-base leading-[1.8] text-white/85 sm:text-lg">
                {biographyParagraphs.map((paragraph, index) => (
                  <p key={index} className={index === 0 ? "editorial-lead" : undefined}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {settings.careerInterests && settings.careerInterests.length > 0 && (
                <div className="mt-10 border-t border-white/15 pt-7">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                    Engineering Focus &amp; Goals
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settings.careerInterests.map((interest) => (
                      <span
                        key={interest}
                        className="border border-white/20 px-3.5 py-1.5 font-mono text-xs text-white/85"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a
                  href={cvHref}
                  download
                  className="inline-flex items-center gap-2 bg-white px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Download CV</span>
                </a>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 border border-white/30 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>Explore Projects</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Right Column: Portrait / Monogram & Verified Dossier */}
            <div className="min-w-0 lg:col-span-5">
              <div className="border border-white/20 bg-navy">
                <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                  <span>Developer Dossier</span>
                  <span>{settings.location || "Remote · Global"}</span>
                </div>

                {settings.profileImage?.url ? (
                  <div className="relative aspect-[4/5] w-full overflow-hidden border-b border-white/15 bg-navy">
                    <Image
                      src={settings.profileImage.url}
                      alt={settings.profileImage.alt || "Dezaakir"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center border-b border-white/15 p-10 text-center">
                    <BrandLogo className="h-24" label="Dezaakir Official Logo" />
                    <span className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-white/60">
                      {settings.siteTitle || "Dezaakir"}
                    </span>
                  </div>
                )}

                <dl className="divide-y divide-white/10 px-6 font-mono text-xs">
                  <div className="flex items-center justify-between py-4">
                    <dt className="uppercase text-white/50">Discipline</dt>
                    <dd className="font-semibold text-white">Full-Stack Software Engineering</dd>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <dt className="uppercase text-white/50">Core Stack</dt>
                    <dd className="font-semibold text-white">TypeScript · Next.js · Bun</dd>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <dt className="uppercase text-white/50">Location</dt>
                    <dd className="font-semibold text-white">
                      {settings.location || "Remote · Global"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. CAREER JOURNEY & EDUCATION TIMELINE                            */}
      {/* ================================================================= */}
      {(settings.experience.length > 0 || settings.education.length > 0) && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid gap-16 lg:grid-cols-12">
              {settings.experience.length > 0 && (
                <div className={settings.education.length > 0 ? "lg:col-span-7" : "lg:col-span-12"}>
                  <MotionReveal>
                    <div className="border-b border-white/15 pb-6">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                        01 · Career Journey
                      </p>
                      <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                        Experience &amp; Milestones
                      </h2>
                    </div>

                    <div className="relative mt-10 space-y-10 border-l border-white/25 pl-7">
                      {settings.experience.map((exp, idx) => {
                        const start = formatTimelineDate(exp.startDate);
                        const end = exp.current ? "Present" : formatTimelineDate(exp.endDate);
                        return (
                          <div key={exp._id ?? `${exp.company}-${idx}`} className="relative">
                            <span
                              aria-hidden="true"
                              className="absolute top-1.5 -left-[33px] h-2.5 w-2.5 border border-white bg-navy"
                            />
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h3 className="text-xl font-bold tracking-tight text-white">
                                {exp.role}
                              </h3>
                              <span className="font-mono text-xs text-white/55">
                                {start}
                                {end ? ` — ${end}` : ""}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-white/70">
                              {exp.company}
                              {exp.location ? ` · ${exp.location}` : ""}
                            </p>
                            {exp.description && (
                              <p className="mt-3 text-sm leading-relaxed text-white/75">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </MotionReveal>
                </div>
              )}

              {settings.education.length > 0 && (
                <div className={settings.experience.length > 0 ? "lg:col-span-5" : "lg:col-span-12"}>
                  <MotionReveal delay={0.1}>
                    <div className="border-b border-white/15 pb-6">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                        02 · Academic Background
                      </p>
                      <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                        Education
                      </h2>
                    </div>

                    <div className="relative mt-10 space-y-10 border-l border-white/25 pl-7">
                      {settings.education.map((edu, idx) => {
                        const start = formatTimelineDate(edu.startDate);
                        const end = formatTimelineDate(edu.endDate);
                        return (
                          <div key={edu._id ?? `${edu.institution}-${idx}`} className="relative">
                            <span
                              aria-hidden="true"
                              className="absolute top-1.5 -left-[33px] h-2.5 w-2.5 border border-white bg-navy"
                            />
                            <span className="font-mono text-xs text-white/55">
                              {start}
                              {end ? ` — ${end}` : ""}
                            </span>
                            <h3 className="mt-1 text-lg font-bold tracking-tight text-white">
                              {edu.degree}
                              {edu.field ? ` in ${edu.field}` : ""}
                            </h3>
                            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-white/70">
                              {edu.institution}
                            </p>
                            {edu.description && (
                              <p className="mt-3 text-sm leading-relaxed text-white/75">
                                {edu.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </MotionReveal>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. TECHNICAL EXPERTISE — SPECIFICATION MATRIX                     */}
      {/* ================================================================= */}
      {activeSkillDomains.length > 0 && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <MotionReveal>
              <div className="border-b border-white/15 pb-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  03 · Technical Expertise
                </p>
                <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Skills &amp; Specialties
                </h2>
              </div>

              <div className="divide-y divide-white/15 border-b border-white/15">
                {activeSkillDomains.map(([domain, skills], idx) => (
                  <div
                    key={domain}
                    className="grid items-baseline gap-4 py-6 md:grid-cols-12"
                  >
                    <div className="flex items-baseline gap-4 md:col-span-4">
                      <span className="font-mono text-xs text-white/40">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-base font-bold tracking-tight text-white">{domain}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 md:col-span-8">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="border border-white/15 bg-white/[0.02] px-3 py-1 font-mono text-xs text-white/85"
                        >
                          {skill}
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
      {/* 4. ENGINEERING PHILOSOPHY                                         */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <MotionReveal>
            <div className="border-b border-white/15 pb-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                04 · Engineering Philosophy
              </p>
              <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How I Build Software
              </h2>
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/15 border-b border-white/15 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
              {ENGINEERING_PHILOSOPHY.map((pillar) => (
                <div key={pillar.index} className="py-7 sm:px-6 lg:py-8 lg:first:pl-0 lg:last:pr-0">
                  <span className="font-mono text-xs text-white/40">{pillar.index}</span>
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. COLLABORATION CTA                                              */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col items-start justify-between gap-8 border border-white/20 bg-navy p-8 sm:p-12 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                Next Step
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                Interested in working together?
              </h2>
              <p className="mt-3 text-base text-white/75">
                Download my CV or reach out directly to discuss your next web platform or engineering
                initiative.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={cvHref}
                download
                className="inline-flex items-center gap-2 border border-white/30 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download CV</span>
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-white px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <span>Contact Me</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
