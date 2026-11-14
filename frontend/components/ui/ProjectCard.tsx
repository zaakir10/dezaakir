import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { ProjectItem } from "@/types";

export function ProjectCard({
  project,
  variant = "default",
}: {
  project: ProjectItem;
  index?: number;
  variant?: "default" | "editorial";
}) {
  if (variant === "editorial") {
    return (
      <article className="group grid grid-cols-1 items-stretch border border-white/15 bg-white/[0.015] transition duration-200 hover:border-white/40 lg:grid-cols-12">
        {/* 1. Project Cover Image */}
        <Link
          href={`/projects/${project.slug}`}
          className="relative block aspect-[16/10] w-full overflow-hidden border-b border-white/15 bg-navy lg:col-span-6 lg:aspect-auto lg:min-h-[320px] lg:border-r lg:border-b-0"
        >
          {project.coverImage?.url ? (
            <Image
              src={project.coverImage.url}
              alt={project.coverImage.alt || project.title}
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="bg-editorial-grid flex h-full w-full items-center justify-center p-8">
              <BrandLogo className="h-12 opacity-45" label={project.title} />
            </div>
          )}
        </Link>

        {/* 2. Title, 3. Short Description, 4. Technologies, 5. Links */}
        <div className="flex min-w-0 flex-col justify-between p-6 sm:p-8 lg:col-span-6">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <Link
                href={`/projects/${project.slug}`}
                className="transition group-hover:underline group-hover:underline-offset-4"
              >
                {project.title}
              </Link>
            </h3>

            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/75 sm:text-base">
              {project.summary}
            </p>

            {project.technologies.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {project.technologies.slice(0, 6).map((tech) => (
                  <span
                    key={tech}
                    className="border border-white/15 px-2.5 py-1 font-mono text-[11px] text-white/80"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 font-mono text-xs">
            <Link
              href={`/projects/${project.slug}`}
              className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-white transition hover:underline hover:underline-offset-4"
            >
              <span>View Case Study</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>

            <div className="flex flex-wrap items-center gap-4 text-white/75">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 transition hover:text-white"
                >
                  <span>GitHub</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-white transition hover:underline hover:underline-offset-4"
                >
                  <span>Live Demo</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col border border-white/15 bg-white/[0.015] transition duration-200 hover:border-white/40 hover:bg-white/[0.03]">
      {/* 1. Project Cover Image at the Top */}
      <Link
        href={`/projects/${project.slug}`}
        className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-white/10 bg-navy"
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
          <div className="bg-editorial-grid flex h-full w-full items-center justify-center p-6">
            <BrandLogo className="h-10 opacity-45" label={project.title} />
          </div>
        )}
      </Link>

      {/* Card Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-6">
        <div>
          {/* 2. Project Title directly below the image */}
          <h3 className="text-xl font-bold leading-snug tracking-tight text-white">
            <Link
              href={`/projects/${project.slug}`}
              className="transition group-hover:underline group-hover:underline-offset-4"
            >
              {project.title}
            </Link>
          </h3>

          {/* 3. Short Project Description */}
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-white/70">
            {project.summary}
          </p>

          {/* 4. Technologies Used */}
          {project.technologies.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 5).map((tech) => (
                <span
                  key={tech}
                  className="border border-white/15 px-2.5 py-0.5 font-mono text-[11px] text-white/80"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 5. Case Study, Live Demo & GitHub Links */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-xs">
          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-white transition hover:underline hover:underline-offset-4"
          >
            <span>Case Study</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <div className="flex flex-wrap items-center gap-4 text-white/75">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition hover:text-white"
              >
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-white transition hover:underline hover:underline-offset-4"
              >
                <span>Live Demo</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
