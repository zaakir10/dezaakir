import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Code2, ExternalLink } from "lucide-react";
import type { ProjectItem } from "@/types";

export function ProjectCard({ project }: { project: ProjectItem }) {
  return (
    <article className="group flex flex-col justify-between rounded-lg border border-white/15 bg-white/[0.03] p-6 transition hover:border-white/40 hover:bg-white/[0.06]">
      <div>
        {project.coverImage?.url ? (
          <div className="relative mb-5 aspect-video w-full overflow-hidden rounded-md border border-white/10 bg-navy">
            <Image
              src={project.coverImage.url}
              alt={project.coverImage.alt || project.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="mb-5 flex aspect-video w-full items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            <Code2 className="h-10 w-10 text-white/40" />
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-mono text-white/60">
          {project.category?.name && (
            <span className="rounded border border-white/20 px-2 py-0.5 text-white/80">{project.category.name}</span>
          )}
          {project.featured && (
            <span className="rounded bg-white px-2 py-0.5 font-semibold text-navy">Featured</span>
          )}
        </div>

        <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
          <Link href={`/projects/${project.slug}`} className="hover:underline">
            {project.title}
          </Link>
        </h3>

        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-white/75">{project.summary}</p>
      </div>

      <div className="mt-6">
        {project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 6).map((tech) => (
              <span
                key={tech}
                className="rounded border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs text-white/80"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-medium">
          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex items-center gap-1 text-white transition hover:underline"
          >
            Case Study <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <div className="flex items-center gap-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white/70 transition hover:text-white"
              >
                GitHub <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white/70 transition hover:text-white"
              >
                Live Demo <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
