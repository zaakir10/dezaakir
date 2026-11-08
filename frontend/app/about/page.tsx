import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Briefcase, Compass, Download, GraduationCap, Mail, Terminal } from "lucide-react";
import { fetchPublicSettings } from "@/lib/api";

export const metadata: Metadata = {
  title: "About",
  description:
    "Professional biography, work experience, education, technical skills, career interests, and downloadable CV of Dezaakir.",
};

export default async function AboutPage() {
  const settings = await fetchPublicSettings();
  const cvHref = settings.cvUrl || "/dezaakir-cv.pdf";

  const skillsByCategory = settings.skills.reduce<Record<string, string[]>>((acc, s) => {
    const cat = s.category || "Engineering";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(s.name);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      {/* Biography Header */}
      <section className="grid gap-10 border-b border-white/15 pb-16 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="font-mono text-xs tracking-widest text-white/60 uppercase">About · Biography</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{settings.siteTitle}</h1>
          <p className="mt-2 font-mono text-sm text-white/75">{settings.tagline}</p>

          <div className="mt-6 space-y-4 text-base leading-relaxed text-white/85">
            {settings.biography.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={cvHref}
              download
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-white/90"
            >
              <Download className="h-4 w-4" />
              Download CV (PDF)
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-md border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <Mail className="h-4 w-4" />
              Contact Dezaakir
            </Link>
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="rounded-xl border border-white/20 bg-white/[0.03] p-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-white/15 bg-navy">
              {settings.profileImage?.url ? (
                <Image
                  src={settings.profileImage.url}
                  alt={settings.profileImage.alt || "Dezaakir"}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-6">
                  <Image
                    src="/logo.png"
                    alt="Dezaakir Logo"
                    width={120}
                    height={120}
                    className="h-28 w-auto object-contain"
                  />
                </div>
              )}
            </div>

            <dl className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="font-mono text-white/60 uppercase">Focus</dt>
                <dd className="font-medium text-white">Full-Stack · AI · Security</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="font-mono text-white/60 uppercase">Location</dt>
                <dd className="font-medium text-white">{settings.location || "Remote"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-mono text-white/60 uppercase">Stack</dt>
                <dd className="font-mono text-white">Next.js · Bun · MongoDB</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Work Experience */}
      <section className="border-b border-white/15 py-16">
        <div className="flex items-center gap-2.5">
          <Briefcase className="h-5 w-5 text-white" />
          <h2 className="text-2xl font-semibold tracking-tight text-white">Work Experience</h2>
        </div>

        <div className="mt-8 space-y-6">
          {settings.experience.map((exp, idx) => {
            const start = new Date(exp.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short" });
            const end = exp.current
              ? "Present"
              : exp.endDate
                ? new Date(exp.endDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })
                : "";
            return (
              <div
                key={exp._id ?? idx}
                className="rounded-lg border border-white/15 bg-white/[0.03] p-6"
              >
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <h3 className="text-lg font-semibold text-white">
                    {exp.role} · <span className="text-white/80">{exp.company}</span>
                  </h3>
                  <span className="font-mono text-xs text-white/65">
                    {start} — {end}
                    {exp.location ? ` · ${exp.location}` : ""}
                  </span>
                </div>
                {exp.description && <p className="mt-3 text-sm leading-relaxed text-white/75">{exp.description}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Education */}
      <section className="border-b border-white/15 py-16">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-5 w-5 text-white" />
          <h2 className="text-2xl font-semibold tracking-tight text-white">Education</h2>
        </div>

        <div className="mt-8 space-y-6">
          {settings.education.map((ed, idx) => {
            const startYear = new Date(ed.startDate).getFullYear();
            const endYear = ed.endDate ? new Date(ed.endDate).getFullYear() : "Present";
            return (
              <div
                key={ed._id ?? idx}
                className="rounded-lg border border-white/15 bg-white/[0.03] p-6"
              >
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <h3 className="text-lg font-semibold text-white">
                    {ed.degree}
                    {ed.field ? ` in ${ed.field}` : ""}
                  </h3>
                  <span className="font-mono text-xs text-white/65">
                    {startYear} — {endYear}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-white/80">{ed.institution}</p>
                {ed.description && <p className="mt-3 text-sm leading-relaxed text-white/75">{ed.description}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Technical Skills */}
      <section className="border-b border-white/15 py-16">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-white" />
          <h2 className="text-2xl font-semibold tracking-tight text-white">Technical Skills</h2>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {Object.entries(skillsByCategory).map(([category, list]) => (
            <div key={category} className="rounded-lg border border-white/15 bg-white/[0.03] p-6">
              <h3 className="font-mono text-xs font-semibold tracking-widest text-white uppercase">{category}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {list.map((skill) => (
                  <span
                    key={skill}
                    className="rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-xs text-white"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Career Interests */}
      <section className="pt-16">
        <div className="flex items-center gap-2.5">
          <Compass className="h-5 w-5 text-white" />
          <h2 className="text-2xl font-semibold tracking-tight text-white">Career Interests</h2>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {settings.careerInterests.map((interest) => (
            <span
              key={interest}
              className="rounded-md border border-white/20 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white"
            >
              {interest}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
