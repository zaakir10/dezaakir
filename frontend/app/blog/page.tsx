import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { fetchPublicBlogs } from "@/lib/api";

export const metadata: Metadata = {
  title: "Technology Blog",
  description:
    "In-depth articles, programming tutorials, and engineering notes on full-stack development, AI, and application security by Dezaakir.",
};

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    tag?: string;
    search?: string;
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const category = sp.category?.trim() || undefined;
  const tag = sp.tag?.trim() || undefined;
  const search = sp.search?.trim() || undefined;

  const { blogs, categories, tags, meta } = await fetchPublicBlogs({
    page,
    limit: 9,
    category,
    tag,
    search,
  });

  const featuredArticles = page === 1 && !category && !tag && !search ? blogs.filter((b) => b.featured) : [];

  const buildHref = (next: { page?: number; category?: string; tag?: string; search?: string }) => {
    const qs = new URLSearchParams();
    const c = next.category !== undefined ? next.category : category;
    const t = next.tag !== undefined ? next.tag : tag;
    const s = next.search !== undefined ? next.search : search;
    const p = next.page ?? 1;
    if (c) qs.set("category", c);
    if (t) qs.set("tag", t);
    if (s) qs.set("search", s);
    if (p > 1) qs.set("page", String(p));
    const str = qs.toString();
    return str ? `/blog?${str}` : "/blog";
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <header className="border-b border-white/15 pb-12">
        <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Dezaakir Publication</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Technology Blog & Tutorials
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
          Architectural deep dives, security engineering guides, and practical tutorials on modern full-stack
          development and AI.
        </p>

        {/* Search & Category Filter */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form action="/blog" method="GET" className="relative w-full sm:max-w-sm">
            {category && <input type="hidden" name="category" value={category} />}
            {tag && <input type="hidden" name="tag" value={tag} />}
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search articles & tutorials..."
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
                All Topics
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

        {/* Tags bar */}
        {tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-white/50">Tags:</span>
            {tags.map((item) => (
              <Link
                key={item.id}
                href={buildHref({ tag: tag === item.slug ? "" : item.slug, page: 1 })}
                className={`rounded border px-2.5 py-0.5 font-mono text-xs transition ${
                  tag === item.slug
                    ? "border-white bg-white font-semibold text-navy"
                    : "border-white/15 bg-white/5 text-white/75 hover:border-white/40"
                }`}
              >
                #{item.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Featured Articles Highlight */}
      {featuredArticles.length > 0 && (
        <section className="mt-12 border-b border-white/15 pb-12">
          <h2 className="font-mono text-xs font-semibold tracking-widest text-white uppercase">Featured Articles</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {featuredArticles.slice(0, 2).map((article) => (
              <BlogCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* Article Grid & Pagination */}
      {blogs.length > 0 ? (
        <section className="mt-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((article) => (
              <BlogCard key={article.id} article={article} />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <nav
              aria-label="Blog pagination"
              className="mt-14 flex items-center justify-between border-t border-white/15 pt-8 text-sm"
            >
              <span className="font-mono text-xs text-white/65">
                Page {meta.page} of {meta.totalPages} ({meta.total} articles)
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
        </section>
      ) : (
        <div className="mt-14 rounded-lg border border-white/15 bg-white/[0.02] p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-white/50" />
          <h2 className="mt-4 text-xl font-semibold text-white">No articles found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
            {search || category || tag
              ? "No published articles matched your filter criteria."
              : "Published technology articles and programming tutorials will appear here."}
          </p>
          {(search || category || tag) && (
            <Link
              href="/blog"
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
