import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { BlogArticle } from "@/types";

export function BlogCard({
  article,
  variant = "default",
}: {
  article: BlogArticle;
  variant?: "default" | "horizontal";
}) {
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

  if (variant === "horizontal") {
    return (
      <article className="group grid grid-cols-1 items-stretch gap-6 border-b border-white/15 py-7 first:pt-0 last:border-b-0 md:grid-cols-12">
        {/* 1. Cover Image */}
        <Link
          href={`/blog/${article.slug}`}
          className="relative block aspect-[16/10] w-full overflow-hidden border border-white/15 bg-navy md:col-span-5 lg:col-span-4"
        >
          {article.coverImage?.url ? (
            <Image
              src={article.coverImage.url}
              alt={article.coverImage.alt || article.title}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="bg-editorial-grid flex h-full w-full items-center justify-center p-6">
              <BrandLogo className="h-10 opacity-45" label={article.title} />
            </div>
          )}
        </Link>

        {/* 2. Title, 3. Short Description, 4. Date & Category, 5. Read More */}
        <div className="flex min-w-0 flex-col justify-between md:col-span-7 lg:col-span-8">
          <div>
            <h3 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
              <Link
                href={`/blog/${article.slug}`}
                className="transition group-hover:underline group-hover:underline-offset-4"
              >
                {article.title}
              </Link>
            </h3>

            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-white/70 sm:text-base">
              {article.excerpt}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
              <time dateTime={article.publishedAt || article.createdAt}>{dateLabel}</time>
              <span aria-hidden="true">·</span>
              <span className="uppercase tracking-wider text-white/80">{categoryLabel}</span>
            </div>

            <Link
              href={`/blog/${article.slug}`}
              className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-white transition group-hover:translate-x-0.5"
            >
              <span>Read More</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col border border-white/15 bg-white/[0.015] transition duration-200 hover:border-white/40 hover:bg-white/[0.03]">
      {/* 1. Cover Image at the Top */}
      <Link
        href={`/blog/${article.slug}`}
        className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-white/10 bg-navy"
      >
        {article.coverImage?.url ? (
          <Image
            src={article.coverImage.url}
            alt={article.coverImage.alt || article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="bg-editorial-grid flex h-full w-full items-center justify-center p-6">
            <BrandLogo className="h-10 opacity-45" label={article.title} />
          </div>
        )}
      </Link>

      {/* Card Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-6">
        <div>
          {/* 2. Blog Title directly below the image */}
          <h3 className="text-xl font-bold leading-snug tracking-tight text-white">
            <Link
              href={`/blog/${article.slug}`}
              className="transition group-hover:underline group-hover:underline-offset-4"
            >
              {article.title}
            </Link>
          </h3>

          {/* 3. Short Description */}
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-white/70">
            {article.excerpt}
          </p>
        </div>

        {/* 4. Publication Date & Category + 5. Read More Link */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-white/60">
            <time dateTime={article.publishedAt || article.createdAt}>{dateLabel}</time>
            <span aria-hidden="true">·</span>
            <span className="uppercase tracking-wider text-white/80">{categoryLabel}</span>
          </div>

          <div className="mt-3">
            <Link
              href={`/blog/${article.slug}`}
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition group-hover:translate-x-0.5"
            >
              <span>Read More</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
