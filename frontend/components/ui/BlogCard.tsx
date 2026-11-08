import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, FileText } from "lucide-react";
import type { BlogArticle } from "@/types";

export function BlogCard({ article }: { article: BlogArticle }) {
  const dateLabel = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <article className="group flex flex-col justify-between rounded-lg border border-white/15 bg-white/[0.03] p-6 transition hover:border-white/40 hover:bg-white/[0.06]">
      <div>
        {article.coverImage?.url ? (
          <div className="relative mb-5 aspect-video w-full overflow-hidden rounded-md border border-white/10 bg-navy">
            <Image
              src={article.coverImage.url}
              alt={article.coverImage.alt || article.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="mb-5 flex aspect-video w-full items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            <FileText className="h-10 w-10 text-white/40" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-white/65">
          {article.category?.name && (
            <span className="rounded border border-white/20 px-2 py-0.5 text-white/85">{article.category.name}</span>
          )}
          {article.featured && <span className="rounded bg-white px-2 py-0.5 font-semibold text-navy">Featured</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readingTime} min read
          </span>
          {dateLabel && <span>· {dateLabel}</span>}
        </div>

        <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
          <Link href={`/blog/${article.slug}`} className="hover:underline">
            {article.title}
          </Link>
        </h3>

        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-white/75">{article.excerpt}</p>
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        {article.tags && article.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {article.tags.slice(0, 4).map((tag) => (
              <span
                key={tag.id || tag.slug}
                className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/75"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/blog/${article.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white transition group-hover:translate-x-0.5"
        >
          Read Article <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
