import type { Metadata } from "next";
import Link from "next/link";
import { Code2, Search } from "lucide-react";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { fetchPublicProjects } from "@/lib/api";

export const metadata: Metadata = {
  title: "Projects",
  description: "Full-stack software engineering, security, and AI projects built by Dezaakir.",
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
    <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <header className="border-b border-white/15 pb-12">
        <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Engineering Portfolio</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Projects & Case Studies</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
          Production web applications, developer tools, and AI systems engineered with strict security and architectural
          standards.
        </p>

        {/* Search & Category Filter */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form action="/projects" method="GET" className="relative w-full sm:max-w-sm">
            {category && <input type="hidden" name="category" value={category} />}
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search projects or technologies..."
              maxLength={80}
              className="w-full rounded-md border border-white/20 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-white/50 focus:border-white"
            />
          </form>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ category: "", page: 1 })}
                className={`rounded-md border px-3 py-1.5 font-mono text-xs transition ${
                  !category
                    ? "border-white bg-white font-semibold text-navy"
                    : "border-white/20 text-white/75 hover:border-white/50 hover:text-white"
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={buildHref({ category: cat.slug, page: 1 })}
                  className={`rounded-md border px-3 py-1.5 font-mono text-xs transition ${
                    category === cat.slug
                      ? "border-white bg-white font-semibold text-navy"
                      : "border-white/20 text-white/75 hover:border-white/50 hover:text-white"
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {projects.length > 0 ? (
        <>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <nav
              aria-label="Projects pagination"
              className="mt-14 flex items-center justify-between border-t border-white/15 pt-8 text-sm"
            >
              <span className="font-mono text-xs text-white/65">
                Page {meta.page} of {meta.totalPages} ({meta.total} projects)
              </span>
              <div className="flex items-center gap-3">
                {meta.page > 1 && (
                  <Link
                    href={buildHref({ page: meta.page - 1 })}
                    className="rounded-md border border-white/25 px-4 py-2 text-xs font-medium text-white hover:bg-white/10"
                  >
                    Previous
                  </Link>
                )}
                {meta.page < meta.totalPages && (
                  <Link
                    href={buildHref({ page: meta.page + 1 })}
                    className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-navy hover:bg-white/90"
                  >
                    Next
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      ) : (
        <div className="mt-14 rounded-lg border border-white/15 bg-white/[0.02] p-12 text-center">
          <Code2 className="mx-auto h-10 w-10 text-white/50" />
          <h2 className="mt-4 text-xl font-semibold text-white">No projects found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
            {search || category
              ? "No published projects matched your current filter. Try clearing your search query."
              : "Published projects will appear here as soon as they are added in the Admin Dashboard."}
          </p>
          {(search || category) && (
            <Link
              href="/projects"
              className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-xs font-semibold text-navy"
            >
              Reset Filters
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
