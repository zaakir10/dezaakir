import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Terminal,
} from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { fetchPublicBlogs, fetchPublicProjects, fetchPublicSettings } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export default async function HomePage() {
  const [settings, featuredRes, allProjectsRes, { blogs }] = await Promise.all([
    fetchPublicSettings(),
    fetchPublicProjects({ featured: true, limit: 4 }),
    fetchPublicProjects({ limit: 4 }),
    fetchPublicBlogs({ limit: 3 }),
  ]);

  const projects =
    featuredRes.projects.length > 0 ? featuredRes.projects : allProjectsRes.projects;

  const skillsByCategory = settings.skills.reduce<Record<string, string[]>>((acc, skill) => {
    const key = skill.category || "Core Engineering";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(skill.name);
    return acc;
  }, {});

  const social = settings.socialLinks || {};
  const socialLinksList = [
    { label: "GitHub", href: social.github || "https://github.com/dezaakir" },
    ...(social.facebook ? [{ label: "Facebook", href: social.facebook }] : []),
    ...(social.tiktok ? [{ label: "TikTok", href: social.tiktok }] : []),
    ...(social.linkedin ? [{ label: "LinkedIn", href: social.linkedin }] : []),
    ...(social.x ? [{ label: "X / Twitter", href: social.x }] : []),
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
      {/* 1. PREMIUM HERO EXPERIENCE                                        */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-12">
            {/* Hero Copy & Primary Actions */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2.5 border border-white/20 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/85">
                <Terminal className="h-3.5 w-3.5 text-white" />
                <span>{settings.authorName || settings.siteTitle || "Dezaakir"} · Software Engineer</span>
              </div>

              <h1 className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
                {settings.heroTitle || "Building Digital Experiences Through Code & Technology."}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                {settings.heroDescription ||
                  "I'm a software developer passionate about building modern web applications, solving real-world problems, and exploring emerging technologies."}
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2.5 bg-white px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <span>View My Projects</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2.5 border border-white/30 bg-white/[0.02] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
                >
                  <span>Contact Me</span>
                </Link>
              </div>

              {/* Social & GitHub Profile Bar */}
              <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-white/15 pt-7">
                <span className="font-mono text-[11px] uppercase tracking-widest text-white/50">
                  Connect:
                </span>
                {socialLinksList.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border border-white/15 bg-white/[0.02] px-3 py-1.5 font-mono text-xs text-white/80 transition hover:border-white hover:bg-white hover:text-navy"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>

            {/* Architectural Developer Portrait Card */}
            <div className="lg:col-span-5">
              <div className="border border-white/20 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between border-b border-white/15 pb-3.5 font-mono text-[11px] uppercase tracking-wider text-white/60">
                  <span>Developer Profile</span>
                  <span>{settings.location || "Remote · Global"}</span>
                </div>

                <div className="relative mt-4 aspect-square w-full overflow-hidden border border-white/15 bg-navy">
                  {settings.profileImage?.url ? (
                    <Image
                      src={settings.profileImage.url}
                      alt={settings.profileImage.alt || "Dezaakir Portrait"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-10 text-center">
                      <Image
                        src="/logo.png"
                        alt="Dezaakir Official Emblem"
                        width={148}
                        height={148}
                        priority
                        className="h-32 w-auto object-contain"
                      />
                      <p className="mt-5 font-mono text-xs font-bold uppercase tracking-widest text-white">
                        {settings.siteTitle || "Dezaakir"}
                      </p>
                      <p className="mt-1 max-w-xs font-mono text-[11px] text-white/55">
                        {settings.tagline}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 font-mono text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/50">
                      Core Focus
                    </p>
                    <p className="mt-1 font-semibold text-white">Full-Stack Web & Systems</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-white/50">
                      Documentation
                    </p>
                    <Link
                      href="/about"
                      className="mt-1 inline-block font-semibold text-white underline underline-offset-4"
                    >
                      Biography & CV →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. FEATURED PROJECTS SHOWCASE                                     */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                01 / Selected Engineering Work
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Featured Projects
              </h2>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 border border-white/25 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
            >
              <span>View All Projects</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {projects.map((project, idx) => (
                <ProjectCard key={project.id} project={project} index={idx} />
              ))}
            </div>
          ) : (
            <div className="mt-12 border border-white/15 bg-white/[0.02] p-12 text-center">
              <Code2 className="mx-auto h-9 w-9 text-white/45" />
              <h3 className="mt-4 text-lg font-bold text-white">Engineering Portfolio</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
                Published software engineering projects from MongoDB appear here automatically.
              </p>
              <Link
                href="/projects"
                className="mt-6 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy"
              >
                <span>Explore Projects Page</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. ABOUT PREVIEW — DEVELOPER INTRODUCTION                         */}
      {/* ================================================================= */}
      <section className="border-b border-white/15 bg-white/[0.01]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                02 / About the Developer
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Engineering With Clarity, Precision & Purpose.
              </h2>
              <p className="mt-4 font-mono text-xs text-white/65">{settings.tagline}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <span>Read Full Profile</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {settings.cvUrl && (
                  <a
                    href={settings.cvUrl}
                    download
                    className="inline-flex items-center gap-2 border border-white/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download CV</span>
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-5 lg:col-span-7">
              <div className="space-y-4 border-l-2 border-white pl-6 text-base leading-relaxed text-white/85">
                {biographyParagraphs.slice(0, 2).map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {settings.careerInterests && settings.careerInterests.length > 0 && (
                <div className="border border-white/15 bg-navy p-6">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">
                    Core Focus Areas
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settings.careerInterests.map((interest) => (
                      <span
                        key={interest}
                        className="border border-white/20 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. TECHNICAL SKILLS MATRIX                                        */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                03 / Technical Stack
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Languages, Frameworks & Tooling
              </h2>
            </div>
            <Link
              href="/about"
              className="font-mono text-xs uppercase tracking-wider text-white/75 transition hover:text-white"
            >
              Full Technical Breakdown →
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(skillsByCategory).map(([category, items], idx) => (
              <div
                key={category}
                className="flex flex-col justify-between border border-white/15 bg-white/[0.02] p-6 transition hover:border-white/40"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-xs">
                    <span className="font-bold uppercase tracking-wider text-white">
                      {category}
                    </span>
                    <span className="text-white/45">0{idx + 1}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <span
                        key={skill}
                        className="border border-white/20 bg-navy px-3 py-1.5 font-mono text-xs text-white/90"
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
      {/* 5. LATEST BLOG ARTICLES                                           */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                04 / Technology Publication
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Latest Blog Articles
              </h2>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 border border-white/25 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
            >
              <span>Read All Articles</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {blogs.length > 0 ? (
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {blogs.map((article) => (
                <BlogCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="mt-12 border border-white/15 bg-white/[0.02] p-12 text-center">
              <FileText className="mx-auto h-9 w-9 text-white/45" />
              <h3 className="mt-4 text-lg font-bold text-white">Technology Publication</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
                Technical articles, software architecture notes, and tutorials published in the
                Admin Dashboard appear here automatically.
              </p>
              <Link
                href="/blog"
                className="mt-6 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy"
              >
                <span>Open Blog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. CLOSING CONTACT CTA                                            */}
      {/* ================================================================= */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="border border-white/25 bg-white/[0.03] p-8 sm:p-14">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <p className="font-mono text-xs uppercase tracking-widest text-white/60">
                  05 / Initiate a Conversation
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  Ready to build a modern web application or collaborate?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
                  Whether you have a software project in mind, a technical question, or an
                  engineering opportunity, reach out directly.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-white px-7 py-4 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <Mail className="h-4 w-4" />
                  <span>Contact Me</span>
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 px-7 py-4 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
                >
                  <span>Browse Projects</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
