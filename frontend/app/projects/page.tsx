import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Code2, ExternalLink, Search } from "lucide-react";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { fetchPublicProjects } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Modern web applications, full-stack software architecture, and engineering projects built by Dezaakir.",
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
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                Engineering Portfolio · {meta.total} Published Project{meta.total === 1 ? "" : "s"}
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Projects & Case Studies
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
                A curated showcase of full-stack web applications, backend systems, and developer
                tools engineered with TypeScript, Next.js, Bun, and MongoDB.
              </p>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-8 lg:flex-row lg:items-center lg:justify-between">
            <form action="/projects" method="GET" className="flex w-full gap-2 lg:max-w-md">
              {category && <input type="hidden" name="category" value={category} />}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                  type="search"
                  name="search"
                  defaultValue={search ?? ""}
                  placeholder="Search projects or technologies..."
                  maxLength={80}
                  className="w-full border border-white/25 bg-white/[0.03] py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-white/45 focus:border-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
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
                  All Projects
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
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. FEATURED PROJECT SPOTLIGHT                                     */}
      {/* ================================================================= */}
      {spotlightProject && (
        <section className="border-b border-white/15 bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-white/60">
              <span>Featured Spotlight</span>
              <span>/{spotlightProject.category?.name || "Flagship System"}</span>
            </div>

            <div className="grid items-center gap-10 border border-white/20 bg-navy p-6 sm:p-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Link
                  href={`/projects/${spotlightProject.slug}`}
                  className="group relative block aspect-video w-full overflow-hidden border border-white/15 bg-white/[0.02]"
                >
                  {spotlightProject.coverImage?.url ? (
                    <Image
                      src={spotlightProject.coverImage.url}
                      alt={spotlightProject.coverImage.alt || spotlightProject.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 640px"
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-10">
                      <Code2 className="h-12 w-12 text-white/35" />
                      <span className="mt-3 font-mono text-xs uppercase tracking-widest text-white/45">
                        {spotlightProject.title}
                      </span>
                    </div>
                  )}
                </Link>
              </div>

              <div className="lg:col-span-5">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase text-navy">
                    Featured Project
                  </span>
                  {spotlightProject.category?.name && (
                    <span className="border border-white/20 px-2.5 py-0.5 text-[10px] uppercase text-white/80">
                      {spotlightProject.category.name}
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  <Link
                    href={`/projects/${spotlightProject.slug}`}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {spotlightProject.title}
                  </Link>
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  {spotlightProject.summary}
                </p>

                {spotlightProject.technologies.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {spotlightProject.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="border border-white/20 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-white"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/15 pt-5">
                  <Link
                    href={`/projects/${spotlightProject.slug}`}
                    className="inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                  >
                    <span>View Details</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                  {spotlightProject.liveUrl && (
                    <a
                      href={spotlightProject.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
                    >
                      <span>Live Demo</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {spotlightProject.githubUrl && (
                    <a
                      href={spotlightProject.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. ALL PROJECTS GRID & PAGINATION                                 */}
      {/* ================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        {projects.length > 0 ? (
          <>
            <div className="mb-8 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-white/60">
              <span>
                {search || category ? "Filtered Results" : "Complete Portfolio Index"}
              </span>
              <span>
                Showing {projects.length} of {meta.total}
              </span>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, idx) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={(meta.page - 1) * meta.limit + idx}
                />
              ))}
            </div>

            {meta.totalPages > 1 && (
              <nav
                aria-label="Projects pagination"
                className="mt-16 flex items-center justify-between border-t border-white/15 pt-8 font-mono text-xs"
              >
                <span className="text-white/65">
                  Page <strong className="text-white">{meta.page}</strong> of{" "}
                  <strong className="text-white">{meta.totalPages}</strong> ({meta.total} projects)
                </span>
                <div className="flex items-center gap-3">
                  {meta.page > 1 && (
                    <Link
                      href={buildHref({ page: meta.page - 1 })}
                      className="border border-white/25 px-4 py-2 uppercase text-white transition hover:border-white"
                    >
                      ← Previous
                    </Link>
                  )}
                  {meta.page < meta.totalPages && (
                    <Link
                      href={buildHref({ page: meta.page + 1 })}
                      className="bg-white px-4 py-2 font-bold uppercase text-navy transition hover:bg-white/90"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </>
        ) : (
          <div className="border border-white/15 bg-white/[0.02] p-14 text-center">
            <Code2 className="mx-auto h-10 w-10 text-white/45" />
            <h2 className="mt-4 text-xl font-bold text-white">No matching projects found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              {search || category
                ? "No published projects matched your search or category filter. Try clearing the active filters."
                : "Published portfolio projects will appear here as soon as they are published in the Admin Dashboard."}
            </p>
            {(search || category) && (
              <Link
                href="/projects"
                className="mt-6 inline-block bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy"
              >
                Reset Filters
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
