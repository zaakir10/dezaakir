import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Code2,
  Compass,
  Download,
  GraduationCap,
  Layers,
  Mail,
  Terminal,
} from "lucide-react";
import { fetchPublicSettings } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Professional biography, software engineering journey, education, technical expertise, and engineering approach of Dezaakir.",
  alternates: { canonical: `${siteConfig.url}/about` },
};

const CORE_SKILL_DOMAINS = [
  "Frontend Development",
  "Backend Development",
  "Databases",
  "Programming Languages",
  "Networking and Infrastructure",
  "Development Tools",
] as const;

const PROFESSIONAL_APPROACH_PILLARS = [
  {
    index: "01",
    title: "Problem Solving",
    description:
      "Breaking down complex operational and product requirements into clear, maintainable software architectures that solve real-world problems.",
  },
  {
    index: "02",
    title: "Building Scalable Systems",
    description:
      "Designing modular backend APIs, indexed data models, and resilient frontend applications capable of growing reliably under production load.",
  },
  {
    index: "03",
    title: "Clean Code",
    description:
      "Writing strict, self-documenting TypeScript with predictable state management, comprehensive input validation, and clear separation of concerns.",
  },
  {
    index: "04",
    title: "Continuous Learning",
    description:
      "Staying deeply engaged with modern runtime engines, web standards, security best practices, and emerging developer tools.",
  },
  {
    index: "05",
    title: "Technology Innovation",
    description:
      "Exploring applied artificial intelligence, modern full-stack frameworks, and automation to deliver faster, smarter digital experiences.",
  },
] as const;

function normalizeSkillDomain(rawCategory: string): string {
  const lower = rawCategory.toLowerCase();
  if (lower.includes("front")) return "Frontend Development";
  if (lower.includes("back") || lower.includes("api")) return "Backend Development";
  if (lower.includes("data") || lower.includes("sql") || lower.includes("mongo"))
    return "Databases";
  if (lower.includes("lang")) return "Programming Languages";
  if (lower.includes("net") || lower.includes("infra") || lower.includes("cloud") || lower.includes("sec"))
    return "Networking and Infrastructure";
  if (lower.includes("tool") || lower.includes("ai")) return "Development Tools";
  return rawCategory || "Development Tools";
}

export default async function AboutPage() {
  const settings = await fetchPublicSettings();
  const cvHref = settings.cvUrl || "/dezaakir-cv.pdf";

  // Group skills into the 6 core engineering domains + any custom categories
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

  const activeSkillDomains = Object.entries(groupedSkills).filter(
    ([, list]) => list.length > 0
  );

  const biographyParagraphs = settings.biography
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="bg-navy text-white">
      {/* ================================================================= */}
      {/* 1. INTRODUCTION & BIOGRAPHY                                       */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="grid items-start gap-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 border border-white/20 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80">
                <Terminal className="h-3.5 w-3.5 text-white" />
                <span>Personal Profile · Biography</span>
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
                {settings.authorName || settings.siteTitle || "Dezaakir"}
              </h1>

              <p className="mt-3 font-mono text-sm text-white/70">{settings.tagline}</p>

              <div className="mt-8 space-y-5 border-l-2 border-white pl-6 text-base leading-relaxed text-white/85">
                {biographyParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {settings.careerInterests && settings.careerInterests.length > 0 && (
                <div className="mt-8">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">
                    Development & Research Interests
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settings.careerInterests.map((interest) => (
                      <span
                        key={interest}
                        className="border border-white/20 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs text-white"
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
                  className="inline-flex items-center gap-2 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <Download className="h-4 w-4" />
                  <span>Download CV (PDF)</span>
                </a>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 border border-white/30 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
                >
                  <span>Explore Projects</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Portrait & Developer Dossier Card */}
            <div className="lg:col-span-5">
              <div className="border border-white/20 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between border-b border-white/15 pb-3 font-mono text-[11px] uppercase tracking-wider text-white/60">
                  <span>Identity Dossier</span>
                  <span>{settings.location || "Remote · Global"}</span>
                </div>

                <div className="relative mt-4 aspect-square w-full overflow-hidden border border-white/15 bg-navy">
                  {settings.profileImage?.url ? (
                    <Image
                      src={settings.profileImage.url}
                      alt={settings.profileImage.alt || "Dezaakir"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-10 text-center">
                      <BrandLogo className="h-32" label="Dezaakir Official Logo" />
                      <span className="mt-4 font-mono text-xs uppercase tracking-widest text-white/65">
                        {settings.siteTitle || "Dezaakir"}
                      </span>
                    </div>
                  )}
                </div>

                <dl className="mt-6 divide-y divide-white/10 font-mono text-xs">
                  <div className="flex items-center justify-between py-3">
                    <dt className=" uppercase text-white/55">Discipline</dt>
                    <dd className="font-semibold text-white">Full-Stack Software Engineering</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="uppercase text-white/55">Primary Runtime</dt>
                    <dd className="font-semibold text-white">TypeScript · Next.js · Bun</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="uppercase text-white/55">Location</dt>
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
      {/* 2. PROFESSIONAL JOURNEY (TIMELINE)                                */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="border-b border-white/15 pb-8">
            <p className="font-mono text-xs uppercase tracking-widest text-white/55">
              01 / Career Milestones
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Professional Journey
            </h2>
          </div>

          <div className="mt-12 relative border-l border-white/25 pl-8 space-y-10">
            {settings.experience.map((exp, idx) => {
              const start = new Date(exp.startDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
              });
              const end = exp.current
                ? "Present"
                : exp.endDate
                  ? new Date(exp.endDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                    })
                  : "";

              return (
                <div
                  key={exp._id ?? `${exp.company}-${idx}`}
                  className="relative border border-white/15 bg-white/[0.02] p-6 sm:p-8"
                >
                  {/* Timeline Node Marker */}
                  <span className="absolute top-8 -left-[37px] h-2.5 w-2.5 border border-white bg-white" />

                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-white/55">
                        {exp.company}
                        {exp.location ? ` · ${exp.location}` : ""}
                      </span>
                      <h3 className="mt-1 text-xl font-bold text-white">{exp.role}</h3>
                    </div>

                    <span className="border border-white/20 bg-navy px-3 py-1 font-mono text-xs text-white">
                      {start} — {end}
                    </span>
                  </div>

                  {exp.description && (
                    <p className="mt-4 text-sm leading-relaxed text-white/80">
                      {exp.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. EDUCATION & QUALIFICATIONS                                     */}
      {/* ================================================================= */}
      <section className="border-b border-white/15 bg-white/[0.01]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="border-b border-white/15 pb-8">
            <p className="font-mono text-xs uppercase tracking-widest text-white/55">
              02 / Academic Foundation
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Education
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {settings.education.map((ed, idx) => {
              const startYear = new Date(ed.startDate).getFullYear();
              const endYear = ed.endDate ? new Date(ed.endDate).getFullYear() : "Present";
              return (
                <div
                  key={ed._id ?? idx}
                  className="flex flex-col justify-between border border-white/15 bg-navy p-6 sm:p-8"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-xs text-white/60">
                      <span className="inline-flex items-center gap-2 text-white">
                        <GraduationCap className="h-4 w-4" />
                        <span>{ed.institution}</span>
                      </span>
                      <span>
                        {startYear} — {endYear}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-white">
                      {ed.degree}
                      {ed.field ? ` in ${ed.field}` : ""}
                    </h3>

                    {ed.description && (
                      <p className="mt-3 text-sm leading-relaxed text-white/75">
                        {ed.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. TECHNICAL EXPERTISE (6 ENGINEERING CATEGORIES)                 */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="border-b border-white/15 pb-8">
            <p className="font-mono text-xs uppercase tracking-widest text-white/55">
              03 / Capabilities Matrix
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Technical Expertise
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Organized across core software engineering disciplines, from interactive user
              interfaces and backend APIs to database architecture and infrastructure.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeSkillDomains.map(([domain, list], idx) => (
              <div
                key={domain}
                className="flex flex-col justify-between border border-white/15 bg-white/[0.02] p-6"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-xs">
                    <span className="font-bold uppercase tracking-wider text-white">
                      {domain}
                    </span>
                    <span className="text-white/45">0{idx + 1}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {list.map((skill) => (
                      <span
                        key={skill}
                        className="border border-white/20 bg-navy px-3 py-1.5 font-mono text-xs text-white"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. PROFESSIONAL APPROACH & ENGINEERING PHILOSOPHY                 */}
      {/* ================================================================= */}
      <section className="border-b border-white/15 bg-white/[0.01]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="border-b border-white/15 pb-8">
            <p className="font-mono text-xs uppercase tracking-widest text-white/55">
              04 / Engineering Methodology
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Professional Approach
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROFESSIONAL_APPROACH_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="border border-white/15 bg-navy p-6 transition hover:border-white/40"
              >
                <span className="font-mono text-xs font-bold text-white/45">
                  /{pillar.index}
                </span>
                <h3 className="mt-3 text-lg font-bold text-white">{pillar.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/75">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. CALL TO ACTION                                                 */}
      {/* ================================================================= */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col items-start justify-between gap-8 border border-white/25 bg-white/[0.03] p-8 sm:p-12 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-widest text-white/60">
                Next Steps
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                Explore my engineering work or start a conversation.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Inspect live projects and architectural case studies, or send a direct inquiry
                through the contact page.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                <span>View Projects</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/30 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white"
              >
                <Mail className="h-4 w-4" />
                <span>Contact Dezaakir</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
