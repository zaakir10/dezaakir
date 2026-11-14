import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { BlogArticle } from "@/types";

export function BlogCard({ article }: { article: BlogArticle }) {
  const dateLabel = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date(article.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  const categoryLabel = article.category?.name || "Engineering";

  return (
    <article className="group flex h-full flex-col border border-white/15 bg-white/[0.015] transition duration-200 hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/[0.03]">
      {/* 1. Cover Image at the Top (Strict 16:9) */}
      <Link
        href={`/blog/${article.slug}`}
        className="relative block aspect-video w-full shrink-0 overflow-hidden border-b border-white/10 bg-navy"
      >
        {article.coverImage?.url ? (
          <Image
            src={article.coverImage.url}
            alt={article.coverImage.alt || article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="bg-editorial-grid flex h-full w-full items-center justify-center p-6">
            <BrandLogo className="h-9 opacity-45" label={article.title} />
          </div>
        )}
      </Link>

      {/* Card Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-5 sm:p-6">
        <div>
          {/* 2. Category Label */}
          <span className="inline-block border border-white/20 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
            {categoryLabel}
          </span>

          {/* 3. Article Title */}
          <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
            <Link
              href={`/blog/${article.slug}`}
              className="transition group-hover:underline group-hover:underline-offset-4"
            >
              {article.title}
            </Link>
          </h3>

          {/* 4. Short Description */}
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/70">
            {article.excerpt}
          </p>
        </div>

        {/* 5. Publication Date & Reading Time + 6. Read Article Link */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-white/60">
            <time dateTime={article.publishedAt || article.createdAt}>{dateLabel}</time>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {article.readingTime || 1} min read
            </span>
          </div>

          <div className="mt-3">
            <Link
              href={`/blog/${article.slug}`}
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition group-hover:translate-x-0.5"
            >
              <span>Read Article</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
