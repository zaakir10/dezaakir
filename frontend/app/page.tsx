import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Code2, Cpu, FileText, Mail, ShieldCheck, Terminal } from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { fetchPublicBlogs, fetchPublicProjects, fetchPublicSettings } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export default async function HomePage() {
  const [settings, { projects }, { blogs }] = await Promise.all([
    fetchPublicSettings(),
    fetchPublicProjects({ featured: true, limit: 4 }),
    fetchPublicBlogs({ limit: 3 }),
  ]);

  const skillsByCategory = settings.skills.reduce<Record<string, string[]>>((acc, skill) => {
    const key = skill.category || "Core";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(skill.name);
    return acc;
  }, {});

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.siteTitle || "Dezaakir",
    url: siteConfig.url,
    jobTitle: "Full-Stack & AI Software Engineer",
    description: settings.heroDescription,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Hero & Developer Introduction */}
      <section className="grid items-center gap-12 border-b border-white/15 pb-20 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-xs tracking-wide text-white">
            <Terminal className="h-3.5 w-3.5" />
            {settings.tagline}
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl sm:leading-[1.08]">
            {settings.heroTitle}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {settings.heroDescription}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-white/90"
            >
              Explore Projects <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Read the Publication
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-5 py-3 text-sm font-medium text-white/80 transition hover:text-white"
            >
              Get in Touch
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            <div>
              <p className="font-mono text-xs tracking-wider text-white/60 uppercase">Focus</p>
              <p className="mt-1 text-sm font-semibold text-white">Full-Stack TypeScript</p>
            </div>
            <div>
              <p className="font-mono text-xs tracking-wider text-white/60 uppercase">Intelligence</p>
              <p className="mt-1 text-sm font-semibold text-white">Applied AI & Agents</p>
            </div>
            <div>
              <p className="font-mono text-xs tracking-wider text-white/60 uppercase">Verification</p>
              <p className="mt-1 text-sm font-semibold text-white">OWASP ASVS Level 2</p>
            </div>
          </div>
        </div>

        {/* Profile Photograph / Brand Portrait Card */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-white/20 bg-white/[0.03] p-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-white/15 bg-navy">
              {settings.profileImage?.url ? (
                <Image
                  src={settings.profileImage.url}
                  alt={settings.profileImage.alt || "Dezaakir profile photograph"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 360px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                  <Image
                    src="/logo.png"
                    alt="Dezaakir Portrait Mark"
                    width={140}
                    height={140}
                    priority
                    className="h-32 w-auto object-contain"
                  />
                  <p className="mt-4 font-mono text-xs tracking-widest text-white/70 uppercase">Dezaakir</p>
                </div>
              )}
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{settings.siteTitle}</h2>
                <span className="rounded bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold text-navy">
                  Available
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                Full-Stack Developer & AI Engineer building resilient software systems and publishing practical
                engineering guides.
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-xs text-white/65">
                <span>{settings.location || "Remote · Global"}</span>
                <Link href="/about" className="text-white underline underline-offset-4">
                  Full Biography →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Core Engineering Pillars & Skills Overview */}
      <section className="border-b border-white/15 py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Capabilities</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Technical Skills & Stack</h2>
          </div>
          <Link href="/about" className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline">
            View Full Resume & CV <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(skillsByCategory).map(([category, items]) => (
            <div key={category} className="rounded-lg border border-white/15 bg-white/[0.03] p-6">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-white uppercase">
                {category.includes("Security") ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : category.includes("Backend") ? (
                  <Cpu className="h-4 w-4" />
                ) : (
                  <Code2 className="h-4 w-4" />
                )}
                {category}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                {items.map((skill) => (
                  <li key={skill} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Featured Projects */}
      <section className="border-b border-white/15 py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Selected Work</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Featured Projects</h2>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline"
          >
            All Projects <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {projects.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-lg border border-white/15 bg-white/[0.02] p-10 text-center">
            <Code2 className="mx-auto h-8 w-8 text-white/50" />
            <h3 className="mt-3 text-lg font-semibold text-white">Projects Portfolio</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              Published projects from MongoDB appear here automatically once marked as published in the Admin Dashboard.
            </p>
            <Link
              href="/projects"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-white/25 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-navy"
            >
              Browse Projects Archive <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* 4. Latest Blog Articles */}
      <section className="border-b border-white/15 py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Technology Publication</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Latest Articles & Tutorials</h2>
          </div>
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline">
            View All Articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {blogs.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {blogs.map((article) => (
              <BlogCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-lg border border-white/15 bg-white/[0.02] p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-white/50" />
            <h3 className="mt-3 text-lg font-semibold text-white">Engineering Articles & Guides</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              Deep-dive programming tutorials and architecture notes published via the Admin Dashboard will be listed
              here.
            </p>
            <Link
              href="/blog"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-white/25 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-navy"
            >
              Visit Technology Blog <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* 5. Experience Summary */}
      <section className="border-b border-white/15 py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Career</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Experience Summary</h2>
          </div>
          <Link href="/about" className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline">
            Education & Full Timeline <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 space-y-6">
          {settings.experience.map((exp, idx) => {
            const startYear = new Date(exp.startDate).getFullYear();
            const endYear = exp.current
              ? "Present"
              : exp.endDate
                ? new Date(exp.endDate).getFullYear()
                : "";
            return (
              <div
                key={exp._id ?? `${exp.company}-${idx}`}
                className="rounded-lg border border-white/15 bg-white/[0.03] p-6"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-4 w-4 text-white/70" />
                    <h3 className="text-lg font-semibold text-white">
                      {exp.role} · <span className="text-white/80">{exp.company}</span>
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-white/65">
                    {startYear} — {endYear}
                    {exp.location ? ` · ${exp.location}` : ""}
                  </span>
                </div>
                {exp.description && (
                  <p className="mt-3 text-sm leading-relaxed text-white/75">{exp.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Contact Section */}
      <section className="pt-20">
        <div className="rounded-xl border border-white/20 bg-white/[0.04] p-8 sm:p-12">
          <div className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Collaboration & Inquiries</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Have a project, security review, or engineering role in mind?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              Send a direct message through the encrypted contact form. All inquiries are validated, rate-limited, and
              delivered straight to the Dezaakir Admin Dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-white/90"
              >
                <Mail className="h-4 w-4" />
                Send a Message
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Learn More About Dezaakir
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
