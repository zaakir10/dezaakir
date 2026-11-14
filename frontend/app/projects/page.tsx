import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink, Search } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { fetchPublicProjects } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Modern web applications, full-stack software architecture, and engineering case studies built by Dezaakir.",
  alternates: { canonical: `${siteConfig.url}/projects` },
};

interface ProjectsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const category = sp.category?.trim() || undefined;
  const search = sp.search?.trim() || undefined;

  const { projects, categories, meta } = await fetchPublicProjects({
    page,
    limit: 9,
    category,
    search,
  });

  const showSpotlight = page === 1 && !category && !search;
  const spotlightProject = showSpotlight
    ? projects.find((p) => p.featured) || projects[0]
    : undefined;

  const galleryProjects = spotlightProject
    ? projects.filter((p) => p.id !== spotlightProject.id)
    : projects;

  // Derive top technologies from the current project catalog for quick filtering
  const techCounts = new Map<string, number>();
  for (const proj of projects) {
    for (const tech of proj.technologies ?? []) {
      techCounts.set(tech, (techCounts.get(tech) ?? 0) + 1);
    }
  }
  const topTechnologies = Array.from(techCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  const buildHref = (next: { page?: number; category?: string; search?: string }) => {
    const qs = new URLSearchParams();
    const c = next.category !== undefined ? next.category : category;
    const s = next.search !== undefined ? next.search : search;
    const p = next.page ?? 1;
    if (c) qs.set("category", c);
    if (s) qs.set("search", s);
    if (p > 1) qs.set("page", String(p));
    const str = qs.toString();
    return str ? `/projects?${str}` : "/projects";
  };

  return (
    <main className="bg-navy text-white">
      {/* ================================================================= */}
      {/* 1. PORTFOLIO MASTHEAD & FILTER CONTROLS                           */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                Engineering Portfolio · {meta.total} Published Project{meta.total === 1 ? "" : "s"}
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-6xl">
                Projects &amp; Case Studies
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                Full-stack web applications, backend platforms, and developer systems engineered
                with a focus on reliability, clean architecture, and craft.
              </p>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-8 lg:flex-row lg:items-center lg:justify-between">
            <form action="/projects" method="GET" className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md">
              {category && <input type="hidden" name="category" value={category} />}
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/45"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  name="search"
                  defaultValue={search ?? ""}
                  placeholder="Search projects or technologies..."
                  maxLength={80}
                  aria-label="Search projects"
                  className="w-full border border-white/25 bg-navy py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-white px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                Search
              </button>
            </form>

            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={buildHref({ category: "", page: 1 })}
                  className={`border px-3.5 py-2 font-mono text-xs uppercase tracking-wider transition ${
                    !category
                      ? "border-white bg-white font-bold text-navy"
                      : "border-white/20 text-white/75 hover:border-white hover:text-white"
                  }`}
                >
                  All
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={buildHref({ category: cat.slug, page: 1 })}
                    className={`border px-3.5 py-2 font-mono text-xs uppercase tracking-wider transition ${
                      category === cat.slug
                        ? "border-white bg-white font-bold text-navy"
                        : "border-white/20 text-white/75 hover:border-white hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Technology Quick Filters */}
          {topTechnologies.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
                Technologies:
              </span>
              {topTechnologies.map((tech) => {
                const isSelected = search?.toLowerCase() === tech.toLowerCase();
                return (
                  <Link
                    key={tech}
                    href={buildHref({ search: isSelected ? "" : tech, page: 1 })}
                    className={`border px-2.5 py-1 font-mono text-[11px] transition ${
                      isSelected
                        ? "border-white bg-white font-bold text-navy"
                        : "border-white/15 text-white/70 hover:border-white/45 hover:text-white"
                    }`}
                  >
                    {tech}
                  </Link>
                );
              })}
              {(category || search) && (
                <Link
                  href="/projects"
                  className="ml-2 font-mono text-[11px] uppercase tracking-wider text-white/60 underline underline-offset-4 hover:text-white"
                >
                  Reset Filters
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. FEATURED PROJECT SPOTLIGHT                                     */}
      {/* ================================================================= */}
      {spotlightProject && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <MotionReveal>
              <div className="mb-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">
                <span>Featured Spotlight</span>
                <span>{spotlightProject.category?.name || "Flagship System"}</span>
              </div>

              <div className="grid grid-cols-1 items-stretch border border-white/20 bg-white/[0.015] lg:grid-cols-12">
                <Link
                  href={`/projects/${spotlightProject.slug}`}
                  className="group relative block aspect-[16/10] w-full overflow-hidden border-b border-white/15 bg-navy lg:col-span-7 lg:aspect-auto lg:min-h-[360px] lg:border-r lg:border-b-0"
                >
                  {spotlightProject.coverImage?.url ? (
                    <Image
                      src={spotlightProject.coverImage.url}
                      alt={spotlightProject.coverImage.alt || spotlightProject.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 660px"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      priority
                    />
                  ) : (
                    <div className="bg-editorial-grid flex h-full w-full items-center justify-center p-10">
                      <BrandLogo className="h-14 opacity-45" label={spotlightProject.title} />
                    </div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-col justify-between p-6 sm:p-10 lg:col-span-5">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      <Link
                        href={`/projects/${spotlightProject.slug}`}
                        className="hover:underline hover:underline-offset-4"
                      >
                        {spotlightProject.title}
                      </Link>
                    </h2>

                    <p className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base">
                      {spotlightProject.summary}
                    </p>

                    {spotlightProject.technologies.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-1.5">
                        {spotlightProject.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="border border-white/15 px-2.5 py-1 font-mono text-[11px] text-white/85"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
                    <Link
                      href={`/projects/${spotlightProject.slug}`}
                      className="inline-flex items-center gap-2 bg-white px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                    >
                      <span>View Case Study</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>

                    {spotlightProject.liveUrl && (
                      <a
                        href={spotlightProject.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
                      >
                        <span>Live Demo</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}

                    {spotlightProject.githubUrl && (
                      <a
                        href={spotlightProject.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white/80 transition hover:border-white hover:text-white"
                      >
                        <span>GitHub</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. PROJECT GALLERY                                                */}
      {/* ================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        {galleryProjects.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {galleryProjects.map((project, idx) => (
              <MotionReveal key={project.id} delay={idx * 0.05}>
                <ProjectCard project={project} index={idx + (spotlightProject ? 1 : 0)} />
              </MotionReveal>
            ))}
          </div>
        ) : !spotlightProject ? (
          <div className="border border-white/15 p-14 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
              No Matching Projects
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">
              {search || category
                ? "No published projects match your current filter."
                : "Engineering portfolio entries are being prepared."}
            </h2>
            {(search || category) && (
              <Link
                href="/projects"
                className="mt-6 inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
              >
                <span>View All Projects</span>
              </Link>
            )}
          </div>
        ) : null}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <nav
            aria-label="Projects pagination"
            className="mt-14 flex items-center justify-between border-t border-white/15 pt-8 font-mono text-xs"
          >
            <Link
              href={buildHref({ page: Math.max(1, page - 1) })}
              aria-disabled={page <= 1}
              className={`inline-flex items-center gap-2 border px-4 py-2.5 uppercase tracking-wider transition ${
                page <= 1
                  ? "pointer-events-none border-white/10 text-white/30"
                  : "border-white/25 text-white hover:border-white"
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Previous</span>
            </Link>

            <span className="text-white/60">
              Page {page} of {meta.totalPages}
            </span>

            <Link
              href={buildHref({ page: Math.min(meta.totalPages, page + 1) })}
              aria-disabled={page >= meta.totalPages}
              className={`inline-flex items-center gap-2 border px-4 py-2.5 uppercase tracking-wider transition ${
                page >= meta.totalPages
                  ? "pointer-events-none border-white/10 text-white/30"
                  : "border-white/25 text-white hover:border-white"
              }`}
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </nav>
        )}
      </section>
    </main>
  );
}
