import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Clock, List, User as UserIcon } from "lucide-react";
import { ArticleEnhancer } from "@/components/ui/ArticleEnhancer";
import { BlogCard } from "@/components/ui/BlogCard";
import { ReadingProgressBar } from "@/components/ui/ReadingProgressBar";
import { ShareArticleBar } from "@/components/ui/ShareArticleBar";
import { fetchPublicBlogBySlug, fetchPublicBlogs } from "@/lib/api";
import { sanitizeHtmlForRender } from "@/lib/sanitizeHtmlClient";
import { siteConfig } from "@/lib/site";

interface BlogDetailProps {
  params: Promise<{ slug: string }>;
}

interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function buildArticleTocAndHtml(sanitizedHtml: string): {
  html: string;
  toc: TocHeading[];
} {
  const toc: TocHeading[] = [];
  let index = 0;

  const html = sanitizedHtml.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, levelStr: string, attrs: string, innerHtml: string) => {
      index += 1;
      const plainText = innerHtml.replace(/<[^>]+>/g, "").trim();
      const slugBase = plainText
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 48);
      const id = slugBase ? `${slugBase}-${index}` : `section-${index}`;
      const level = Number(levelStr) === 3 ? 3 : 2;
      if (plainText) {
        toc.push({ id, text: plainText, level });
      }
      return `<h${levelStr}${attrs} id="${id}">${innerHtml}</h${levelStr}>`;
    }
  );

  return { html, toc };
}

export async function generateMetadata({ params }: BlogDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchPublicBlogBySlug(slug);
  if (!result) {
    return { title: "Article Not Found" };
  }
  const { blog } = result;
  const title = blog.seoTitle || blog.title;
  const description = blog.seoDescription || blog.excerpt;
  const url = `${siteConfig.url}/blog/${blog.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      publishedTime: blog.publishedAt,
      images: blog.coverImage?.url
        ? [{ url: blog.coverImage.url, alt: blog.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: blog.coverImage?.url ? [blog.coverImage.url] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailProps) {
  const { slug } = await params;
  const [result, archiveList] = await Promise.all([
    fetchPublicBlogBySlug(slug),
    fetchPublicBlogs({ limit: 24 }),
  ]);
  if (!result) {
    notFound();
  }

  const { blog, related } = result;
  const rawSafeHtml = sanitizeHtmlForRender(blog.content);
  const { html: htmlWithIds, toc } = buildArticleTocAndHtml(rawSafeHtml);

  const currentIdx = archiveList.blogs.findIndex((b) => b.slug === blog.slug);
  const previousArticle =
    currentIdx >= 0 && currentIdx + 1 < archiveList.blogs.length
      ? archiveList.blogs[currentIdx + 1]
      : undefined;
  const nextArticle =
    currentIdx > 0 ? archiveList.blogs[currentIdx - 1] : undefined;

  const authorName =
    typeof blog.author === "object" && blog.author?.name ? blog.author.name : "Dezaakir";
  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date(blog.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const canonicalUrl = `${siteConfig.url}/blog/${blog.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.excerpt,
    datePublished: blog.publishedAt || blog.createdAt,
    dateModified: blog.updatedAt,
    author: { "@type": "Person", name: authorName },
    url: canonicalUrl,
  };

  return (
    <main className="bg-navy text-white">
      <ReadingProgressBar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ================================================================= */}
      {/* 1. EDITORIAL ARTICLE HEADER                                       */}
      {/* ================================================================= */}
      <header className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-white/65 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Engineering Dispatch</span>
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs text-white/75">
            {blog.category?.name && (
              <Link
                href={`/blog?category=${encodeURIComponent(blog.category.slug)}`}
                className="bg-white px-3 py-1 font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
              >
                {blog.category.name}
              </Link>
            )}
            <span className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {blog.readingTime || 1} min read
            </span>
            <span className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {publishedDate}
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {blog.title}
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl">
            {blog.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-white/25 bg-navy">
                <UserIcon className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-white">{authorName}</p>
                <p className="text-[11px] text-white/55">Dezaakir Publication</p>
              </div>
            </div>

            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <Link
                    key={tag.id || tag.slug}
                    href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                    className="border border-white/15 px-2.5 py-1 text-[11px] text-white/75 transition hover:border-white hover:text-white"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. COVER IMAGE                                                    */}
      {/* ================================================================= */}
      {blog.coverImage?.url && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="relative aspect-video w-full overflow-hidden border border-white/20 bg-navy">
              <Image
                src={blog.coverImage.url}
                alt={blog.coverImage.alt || blog.title}
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. LONG-FORM READING BODY & TABLE OF CONTENTS                     */}
      {/* ================================================================= */}
      <article className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <div className={toc.length >= 2 ? "grid gap-12 lg:grid-cols-12" : "mx-auto max-w-[68ch]"}>
          {toc.length >= 2 && (
            <aside className="min-w-0 lg:col-span-4">
              <div className="sticky top-28 border border-white/15 bg-white/[0.015] p-6">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Contents</span>
                </div>
                <nav aria-label="Table of contents" className="mt-4 space-y-2.5 text-sm">
                  {toc.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block leading-snug text-white/65 transition hover:text-white ${
                        heading.level === 3 ? "pl-4 text-xs" : "font-medium"
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          <div className={toc.length >= 2 ? "min-w-0 lg:col-span-8" : "min-w-0"}>
            <div
              id="blog-article-body"
              className="article-content max-w-[68ch]"
              dangerouslySetInnerHTML={{ __html: htmlWithIds }}
            />
            <ArticleEnhancer containerId="blog-article-body" />

            <div className="mt-14 max-w-[68ch]">
              <ShareArticleBar title={blog.title} url={canonicalUrl} />
            </div>

            {/* Previous & Next Article Navigation */}
            {(previousArticle || nextArticle) && (
              <nav
                aria-label="Article navigation"
                className="mt-10 grid max-w-[68ch] gap-4 border-t border-white/15 pt-8 sm:grid-cols-2"
              >
                {previousArticle ? (
                  <Link
                    href={`/blog/${previousArticle.slug}`}
                    className="group border border-white/15 p-5 transition hover:border-white/45"
                  >
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                      <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                      <span>Previous Article</span>
                    </span>
                    <p className="mt-2 line-clamp-2 text-sm font-bold text-white group-hover:underline group-hover:underline-offset-4">
                      {previousArticle.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}

                {nextArticle && (
                  <Link
                    href={`/blog/${nextArticle.slug}`}
                    className="group border border-white/15 p-5 text-right transition hover:border-white/45"
                  >
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                      <span>Next Article</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <p className="mt-2 line-clamp-2 text-sm font-bold text-white group-hover:underline group-hover:underline-offset-4">
                      {nextArticle.title}
                    </p>
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </article>

      {/* ================================================================= */}
      {/* 4. RELATED ARTICLES                                               */}
      {/* ================================================================= */}
      {related.length > 0 && (
        <section className="border-t border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="flex items-end justify-between border-b border-white/15 pb-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                  Continue Reading
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Related Dispatches
                </h2>
              </div>
              <Link
                href="/blog"
                className="font-mono text-xs font-bold uppercase tracking-wider text-white/75 hover:text-white"
              >
                All Articles →
              </Link>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <BlogCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
