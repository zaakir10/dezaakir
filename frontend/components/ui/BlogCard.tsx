import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock, FileText } from "lucide-react";
import type { BlogArticle } from "@/types";

export function BlogCard({ article }: { article: BlogArticle }) {
  const authorName =
    typeof article.author === "object" && article.author?.name
      ? article.author.name
      : "Dezaakir";

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

  return (
    <article className="group flex flex-col justify-between border border-white/15 bg-white/[0.02] transition duration-200 hover:border-white/45 hover:bg-white/[0.04]">
      <div>
        {/* Editorial Category & Reading Time Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-white/60">
          <span>{article.category?.name || "Technical Dispatch"}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readingTime || 1} min read
          </span>
        </div>

        {/* Cover Image */}
        <Link
          href={`/blog/${article.slug}`}
          className="relative block aspect-video w-full overflow-hidden border-b border-white/10 bg-navy"
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
            <div className="flex h-full w-full flex-col items-center justify-center bg-white/[0.02] p-6 text-center">
              <FileText className="h-9 w-9 text-white/35" />
              <span className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                Dezaakir Publication
              </span>
            </div>
          )}
        </Link>

        {/* Article Title & Short Description */}
        <div className="p-6">
          <h3 className="text-xl font-bold leading-snug tracking-tight text-white">
            <Link
              href={`/blog/${article.slug}`}
              className="transition group-hover:underline group-hover:underline-offset-4"
            >
              {article.title}
            </Link>
          </h3>

          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/75">
            {article.excerpt}
          </p>
        </div>
      </div>

      {/* Author, Date & Read CTA */}
      <div className="px-6 pb-6">
        {article.tags && article.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id || tag.slug}
                className="border border-white/15 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/75"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/15 pt-4 font-mono text-xs">
          <div className="text-[11px] text-white/65">
            <span className="font-semibold text-white">{authorName}</span>
            <span className="mx-1.5">·</span>
            <span>{dateLabel}</span>
          </div>

          <Link
            href={`/blog/${article.slug}`}
            className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-white transition group-hover:translate-x-0.5"
          >
            <span>Read</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
