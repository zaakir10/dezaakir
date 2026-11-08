import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User as UserIcon } from "lucide-react";
import { BlogCard } from "@/components/ui/BlogCard";
import { fetchPublicBlogBySlug } from "@/lib/api";
import { sanitizeHtmlForRender } from "@/lib/sanitizeHtmlClient";
import { siteConfig } from "@/lib/site";

interface BlogDetailProps {
  params: Promise<{ slug: string }>;
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
      images: blog.coverImage?.url ? [{ url: blog.coverImage.url, alt: blog.title }] : undefined,
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
  const safeHtml = sanitizeHtmlForRender(blog.content);
  const authorName =
    typeof blog.author === "object" && blog.author?.name ? blog.author.name : "Dezaakir";
  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.excerpt,
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt,
    author: { "@type": "Person", name: authorName },
    url: `${siteConfig.url}/blog/${blog.slug}`,
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-2 font-mono text-xs text-white/70 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Technology Blog
      </Link>

      <article className="mt-6">
        <header className="border-b border-white/15 pb-10">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-white/70">
            {blog.category?.name && (
              <Link
                href={`/blog?category=${encodeURIComponent(blog.category.slug)}`}
                className="rounded border border-white/25 px-2.5 py-0.5 text-white hover:bg-white hover:text-navy"
              >
                {blog.category.name}
              </Link>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {blog.readingTime} min read
            </span>
            {publishedDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {publishedDate}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <UserIcon className="h-3.5 w-3.5" />
              {authorName}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.12]">
            {blog.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-white/80">{blog.excerpt}</p>

          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <Link
                  key={tag.id || tag.slug}
                  href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                  className="rounded border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs text-white/80 transition hover:border-white/40"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        {blog.coverImage?.url && (
          <div className="relative mt-10 aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-navy">
            <Image
              src={blog.coverImage.url}
              alt={blog.coverImage.alt || blog.title}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Sanitized Rich-Text Content */}
        <div
          className="article-content mt-10"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </article>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="mt-20 border-t border-white/15 pt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Related Articles</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {related.map((item) => (
              <BlogCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
