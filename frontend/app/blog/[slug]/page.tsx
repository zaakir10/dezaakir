import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, List, User as UserIcon } from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { ShareArticleBar } from "@/components/ui/ShareArticleBar";
import { fetchPublicBlogBySlug } from "@/lib/api";
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
  const result = await fetchPublicBlogBySlug(slug);
  if (!result) {
    notFound();
  }

  const { blog, related } = result;
  const rawSafeHtml = sanitizeHtmlForRender(blog.content);
  const { html: htmlWithIds, toc } = buildArticleTocAndHtml(rawSafeHtml);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ================================================================= */}
      {/* 1. ARTICLE EDITORIAL HEADER                                       */}
      {/* ================================================================= */}
      <header className="border-b border-white/15">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Technology Magazine</span>
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs text-white/75">
            {blog.category?.name && (
              <Link
                href={`/blog?category=${encodeURIComponent(blog.category.slug)}`}
                className="bg-white px-3 py-1 font-bold uppercase text-navy transition hover:bg-white/90"
              >
                {blog.category.name}
              </Link>
            )}
            <span className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1">
              <Clock className="h-3.5 w-3.5" />
              {blog.readingTime || 1} min read
            </span>
            <span className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1">
              <Calendar className="h-3.5 w-3.5" />
              {publishedDate}
            </span>
            <span className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1">
              <UserIcon className="h-3.5 w-3.5" />
              {authorName}
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {blog.title}
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            {blog.excerpt}
          </p>

          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <Link
                  key={tag.id || tag.slug}
                  href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                  className="border border-white/15 bg-white/[0.03] px-3 py-1 font-mono text-xs text-white/80 transition hover:border-white hover:text-white"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. FEATURED COVER IMAGE                                           */}
      {/* ================================================================= */}
      {blog.coverImage?.url && (
        <section className="border-b border-white/15 bg-white/[0.01]">
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
      {/* 3. ARTICLE BODY + TABLE OF CONTENTS + SOCIAL SHARING              */}
      {/* ================================================================= */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Main Reading Column */}
          <div className={toc.length > 0 ? "lg:col-span-8" : "lg:col-span-10 lg:col-start-2"}>
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: htmlWithIds }}
            />

            <div className="mt-14">
              <ShareArticleBar title={blog.title} url={canonicalUrl} />
            </div>

            {/* Author Bio Box */}
            <div className="mt-10 flex flex-col justify-between gap-4 border border-white/15 bg-white/[0.02] p-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/20 bg-navy p-2">
                  <Image
                    src="/logo.png"
                    alt="Dezaakir"
                    width={32}
                    height={32}
                    className="h-7 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/55">
                    Written By
                  </p>
                  <p className="text-base font-bold text-white">{authorName}</p>
                  <p className="text-xs text-white/70">
                    Full-Stack Software Developer & Technology Writer
                  </p>
                </div>
              </div>
              <Link
                href="/about"
                className="border border-white/25 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white transition hover:border-white"
              >
                Author Profile →
              </Link>
            </div>
          </div>

          {/* Sticky Table of Contents Sidebar (when headings exist) */}
          {toc.length > 0 && (
            <aside className="lg:col-span-4">
              <div className="sticky top-28 border border-white/15 bg-white/[0.02] p-6">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-white">
                  <List className="h-4 w-4" />
                  <span>Table of Contents</span>
                </div>
                <nav aria-label="Table of contents" className="mt-4">
                  <ul className="space-y-2.5 text-xs">
                    {toc.map((item) => (
                      <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                        <a
                          href={`#${item.id}`}
                          className="block leading-snug text-white/70 transition hover:text-white"
                        >
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>
          )}
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="mt-20 border-t border-white/15 pt-16">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                  Further Reading
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Related Articles
                </h2>
              </div>
              <Link
                href="/blog"
                className="font-mono text-xs uppercase tracking-wider text-white/75 hover:text-white"
              >
                All Articles →
              </Link>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {related.map((item) => (
                <BlogCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
