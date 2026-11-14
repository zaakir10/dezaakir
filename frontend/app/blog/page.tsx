import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock, Search } from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { fetchPublicBlogs } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Dezaakir Technology Publication — in-depth software engineering articles, tutorials, and architectural breakdowns.",
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
    limit: 10,
    category,
    tag,
    search,
  });

  const isUnfilteredFirstPage = page === 1 && !category && !tag && !search;
  const featuredArticle = isUnfilteredFirstPage
    ? blogs.find((b) => b.featured) || blogs[0]
    : undefined;

  const gridArticles = featuredArticle
    ? blogs.filter((b) => b.id !== featuredArticle.id)
    : blogs;

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
      {/* 1. TECHNOLOGY MAGAZINE MASTHEAD & FILTERS                         */}
      {/* ================================================================= */}
      <section className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
          <div className="flex flex-col justify-between gap-4 border-b border-white/15 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/55">
                Dezaakir Technology Magazine
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Engineering Dispatch
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                Deep-dive articles on full-stack architecture, TypeScript systems, web security,
                and emerging developer technology.
              </p>
            </div>
            <div className="shrink-0 font-mono text-xs uppercase tracking-[0.18em] text-white/55">
              {meta.total} Published Article{meta.total === 1 ? "" : "s"}
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <form
              action="/blog"
              method="GET"
              className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md"
            >
              {category && <input type="hidden" name="category" value={category} />}
              {tag && <input type="hidden" name="tag" value={tag} />}
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/45"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  name="search"
                  defaultValue={search ?? ""}
                  placeholder="Search articles or topics..."
                  maxLength={80}
                  aria-label="Search blog articles"
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

          {/* Topic Tags Bar */}
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
                Topics:
              </span>
              {tags.map((item) => (
                <Link
                  key={item.id}
                  href={buildHref({ tag: tag === item.slug ? "" : item.slug, page: 1 })}
                  className={`border px-2.5 py-1 font-mono text-[11px] transition ${
                    tag === item.slug
                      ? "border-white bg-white font-bold text-navy"
                      : "border-white/15 text-white/70 hover:border-white/45 hover:text-white"
                  }`}
                >
                  #{item.name}
                </Link>
              ))}
              {(category || tag || search) && (
                <Link
                  href="/blog"
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
      {/* 2. FEATURED ARTICLE — COVER STORY                                 */}
      {/* ================================================================= */}
      {featuredArticle && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <MotionReveal>
              <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                <span>Featured Story</span>
                <span>{featuredArticle.category?.name || "Editorial"}</span>
              </div>

              <article className="group grid grid-cols-1 items-stretch border border-white/25 bg-white/[0.02] transition duration-200 hover:border-white/50 lg:grid-cols-12">
                {/* Large 16:9 Cover Image */}
                <Link
                  href={`/blog/${featuredArticle.slug}`}
                  className="relative block aspect-video w-full overflow-hidden border-b border-white/15 bg-navy lg:col-span-7 lg:border-r lg:border-b-0"
                >
                  {featuredArticle.coverImage?.url ? (
                    <Image
                      src={featuredArticle.coverImage.url}
                      alt={featuredArticle.coverImage.alt || featuredArticle.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 660px"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      priority
                    />
                  ) : (
                    <div className="bg-editorial-grid flex h-full w-full items-center justify-center p-10">
                      <BrandLogo className="h-14 opacity-45" label={featuredArticle.title} />
                    </div>
                  )}
                </Link>

                {/* Balanced Editorial Details */}
                <div className="flex min-w-0 flex-col justify-between p-6 sm:p-8 lg:col-span-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em]">
                      <span className="bg-white px-2.5 py-0.5 font-bold text-navy">
                        {featuredArticle.category?.name || "Featured"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-white/60">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {featuredArticle.readingTime || 1} min read
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
                      <Link
                        href={`/blog/${featuredArticle.slug}`}
                        className="transition group-hover:underline group-hover:underline-offset-4"
                      >
                        {featuredArticle.title}
                      </Link>
                    </h2>

                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-white/75 sm:text-base">
                      {featuredArticle.excerpt}
                    </p>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5">
                    <time
                      dateTime={featuredArticle.publishedAt || featuredArticle.createdAt}
                      className="font-mono text-xs text-white/60"
                    >
                      {featuredArticle.publishedAt
                        ? new Date(featuredArticle.publishedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : new Date(featuredArticle.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                    </time>

                    <Link
                      href={`/blog/${featuredArticle.slug}`}
                      className="inline-flex items-center gap-2 bg-white px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                    >
                      <span>Read Article</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            </MotionReveal>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. RESPONSIVE 1 / 2 / 3-COLUMN ARTICLE GRID                       */}
      {/* ================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        {gridArticles.length > 0 ? (
          <>
            <div className="mb-7 flex items-center justify-between border-b border-white/15 pb-4">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                {search || category || tag ? "Filtered Articles" : "Latest Articles"}
              </h2>
              <span className="font-mono text-[11px] text-white/50">
                Showing {gridArticles.length} article{gridArticles.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {gridArticles.map((article, idx) => (
                <MotionReveal key={article.id} delay={idx * 0.04}>
                  <BlogCard article={article} />
                </MotionReveal>
              ))}
            </div>
          </>
        ) : !featuredArticle ? (
          <div className="border border-white/15 bg-white/[0.015] p-12 text-center sm:p-16">
            <BrandLogo className="mx-auto h-10 opacity-40" label="Dezaakir Publication" />
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-white/50">
              {search || category || tag ? "No Matching Articles" : "Editorial Desk"}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">
              {search || category || tag
                ? "No published articles match your current filter."
                : "New technical essays and engineering guides are in preparation."}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/65">
              {search || category || tag
                ? "Try clearing your search query or selecting another topic."
                : "Check back soon for deep dives on full-stack TypeScript, web security, and system design."}
            </p>
            {(search || category || tag) && (
              <Link
                href="/blog"
                className="mt-6 inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
              >
                <span>View All Articles</span>
              </Link>
            )}
          </div>
        ) : null}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <nav
            aria-label="Blog pagination"
            className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-8 font-mono text-xs"
          >
            <Link
              href={buildHref({ page: Math.max(1, page - 1) })}
              aria-disabled={page <= 1}
              className={`inline-flex items-center gap-2 border px-4 py-2.5 uppercase tracking-wider transition ${
                page <= 1
                  ? "pointer-events-none border-white/10 text-white/30"
                  : "border-white/25 text-white hover:border-white hover:bg-white hover:text-navy"
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
                  : "border-white/25 text-white hover:border-white hover:bg-white hover:text-navy"
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
