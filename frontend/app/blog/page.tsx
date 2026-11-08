import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock, FileText, Search } from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { fetchPublicBlogs } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Dezaakir Technology Magazine — in-depth software engineering articles, tutorials, and architectural breakdowns.",
  alternates: { canonical: `${siteConfig.url}/blog` },
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

  const isUnfilteredFirstPage = page === 1 && !category && !tag && !search;
  const leadArticle = isUnfilteredFirstPage
    ? blogs.find((b) => b.featured) || blogs[0]
    : undefined;

  const buildHref = (next: {
    page?: number;
    category?: string;
    tag?: string;
    search?: string;
  }) => {
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
    <main className="bg-navy text-white">
      {/* ================================================================= */}
      {/* 1. MAGAZINE MASTHEAD, SEARCH & CATEGORY NAVIGATION                */}
      {/* ================================================================= */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                Dezaakir Technology Publication · {meta.total} Published Article
                {meta.total === 1 ? "" : "s"}
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Engineering Dispatch & Tutorials
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
                Long-form technical articles, architecture deep dives, and practical guides on
                modern web development, TypeScript systems, and emerging technologies.
              </p>
            </div>
          </div>

          {/* Search & Category Navigation Bar */}
          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-8 lg:flex-row lg:items-center lg:justify-between">
            <form action="/blog" method="GET" className="flex w-full gap-2 lg:max-w-md">
              {category && <input type="hidden" name="category" value={category} />}
              {tag && <input type="hidden" name="tag" value={tag} />}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                  type="search"
                  name="search"
                  defaultValue={search ?? ""}
                  placeholder="Search articles, topics, or tutorials..."
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
                  All Topics
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

          {/* Topic Tags Bar */}
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/45">
                Topics:
              </span>
              {tags.map((item) => (
                <Link
                  key={item.id}
                  href={buildHref({ tag: tag === item.slug ? "" : item.slug, page: 1 })}
                  className={`border px-2.5 py-1 font-mono text-xs transition ${
                    tag === item.slug
                      ? "border-white bg-white font-bold text-navy"
                      : "border-white/15 bg-white/[0.02] text-white/75 hover:border-white/45 hover:text-white"
                  }`}
                >
                  #{item.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. FEATURED LEAD STORY                                            */}
      {/* ================================================================= */}
      {leadArticle && (
        <section className="border-b border-white/15 bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-white/60">
              <span>Featured Cover Story</span>
              <span>/{leadArticle.category?.name || "Editorial"}</span>
            </div>

            <div className="grid items-center gap-10 border border-white/20 bg-navy p-6 sm:p-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Link
                  href={`/blog/${leadArticle.slug}`}
                  className="group relative block aspect-video w-full overflow-hidden border border-white/15 bg-white/[0.02]"
                >
                  {leadArticle.coverImage?.url ? (
                    <Image
                      src={leadArticle.coverImage.url}
                      alt={leadArticle.coverImage.alt || leadArticle.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 640px"
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-10">
                      <FileText className="h-12 w-12 text-white/35" />
                      <span className="mt-3 font-mono text-xs uppercase tracking-widest text-white/45">
                        Dezaakir Publication
                      </span>
                    </div>
                  )}
                </Link>
              </div>

              <div className="lg:col-span-5">
                <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs text-white/70">
                  <span className="bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase text-navy">
                    Featured
                  </span>
                  {leadArticle.category?.name && (
                    <span className="border border-white/20 px-2.5 py-0.5 text-[10px] uppercase text-white">
                      {leadArticle.category.name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    {leadArticle.readingTime || 1} min read
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
                  <Link
                    href={`/blog/${leadArticle.slug}`}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {leadArticle.title}
                  </Link>
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  {leadArticle.excerpt}
                </p>

                <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-5 font-mono text-xs">
                  <div className="text-white/65">
                    <span className="font-semibold text-white">
                      {typeof leadArticle.author === "object" && leadArticle.author?.name
                        ? leadArticle.author.name
                        : "Dezaakir"}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span>
                      {new Date(
                        leadArticle.publishedAt || leadArticle.createdAt
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <Link
                    href={`/blog/${leadArticle.slug}`}
                    className="inline-flex items-center gap-1.5 bg-white px-4 py-2 font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                  >
                    <span>Read Story</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. LATEST ARTICLES GRID & PAGINATION                              */}
      {/* ================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        {blogs.length > 0 ? (
          <>
            <div className="mb-8 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-white/60">
              <span>
                {search || category || tag ? "Filtered Articles" : "Latest Published Articles"}
              </span>
              <span>
                Showing {blogs.length} of {meta.total}
              </span>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((article) => (
                <BlogCard key={article.id} article={article} />
              ))}
            </div>

            {meta.totalPages > 1 && (
              <nav
                aria-label="Blog pagination"
                className="mt-16 flex items-center justify-between border-t border-white/15 pt-8 font-mono text-xs"
              >
                <span className="text-white/65">
                  Page <strong className="text-white">{meta.page}</strong> of{" "}
                  <strong className="text-white">{meta.totalPages}</strong> ({meta.total} articles)
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
            <FileText className="mx-auto h-10 w-10 text-white/45" />
            <h2 className="mt-4 text-xl font-bold text-white">No articles found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              {search || category || tag
                ? "No published articles matched your current search or topic filter."
                : "Published technical articles and tutorials will appear here automatically."}
            </p>
            {(search || category || tag) && (
              <Link
                href="/blog"
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
