import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Code2, ExternalLink } from "lucide-react";
import type { ProjectItem } from "@/types";

export function ProjectCard({
  project,
  index,
}: {
  project: ProjectItem;
  index?: number;
}) {
  const indexLabel =
    index !== undefined ? String(index + 1).padStart(2, "0") : undefined;

  return (
    <article className="group flex flex-col justify-between border border-white/15 bg-white/[0.02] transition duration-200 hover:border-white/45 hover:bg-white/[0.04]">
      <div>
        {/* Top Architectural Metadata Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-white/60">
          <div className="flex items-center gap-2.5">
            {indexLabel && <span className="text-white/45">/{indexLabel}</span>}
            <span>{project.category?.name || "Engineering"}</span>
          </div>
          {project.featured && (
            <span className="bg-white px-2 py-0.5 text-[10px] font-bold text-navy">
              Featured
            </span>
          )}
        </div>

        {/* Cover Image Frame */}
        <Link
          href={`/projects/${project.slug}`}
          className="relative block aspect-video w-full overflow-hidden border-b border-white/10 bg-navy"
        >
          {project.coverImage?.url ? (
            <Image
              src={project.coverImage.url}
              alt={project.coverImage.alt || project.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-white/[0.02] p-6 text-center">
              <Code2 className="h-9 w-9 text-white/35" />
              <span className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                {project.title}
              </span>
            </div>
          )}
        </Link>

        {/* Project Copy */}
        <div className="p-6">
          <h3 className="text-xl font-bold tracking-tight text-white">
            <Link
              href={`/projects/${project.slug}`}
              className="transition group-hover:underline group-hover:underline-offset-4"
            >
              {project.title}
            </Link>
          </h3>

          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/75">
            {project.summary}
          </p>
        </div>
      </div>

      {/* Technologies & Action Footer */}
      <div className="px-6 pb-6">
        {project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 6).map((tech) => (
              <span
                key={tech}
                className="border border-white/15 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-white/85"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4 font-mono text-xs">
          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-white transition hover:underline hover:underline-offset-4"
          >
            <span>View Details</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <div className="flex items-center gap-4">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white/70 transition hover:text-white"
              >
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white/70 transition hover:text-white"
              >
                <span>Live Demo</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
