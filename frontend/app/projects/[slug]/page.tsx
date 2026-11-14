import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink, Layers } from "lucide-react";
import { ArticleEnhancer } from "@/components/ui/ArticleEnhancer";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { ReadingProgressBar } from "@/components/ui/ReadingProgressBar";
import { fetchPublicProjectBySlug, fetchPublicProjects } from "@/lib/api";
import { sanitizeHtmlForRender } from "@/lib/sanitizeHtmlClient";
import { siteConfig } from "@/lib/site";

interface ProjectDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchPublicProjectBySlug(slug);
  if (!project) {
    return { title: "Project Not Found" };
  }
  const title = project.seoTitle || project.title;
  const description = project.seoDescription || project.summary;
  const url = `${siteConfig.url}/projects/${project.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: project.coverImage?.url
        ? [{ url: project.coverImage.url, alt: project.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: project.coverImage?.url ? [project.coverImage.url] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { slug } = await params;
  const [project, relatedList] = await Promise.all([
    fetchPublicProjectBySlug(slug),
    fetchPublicProjects({ limit: 4 }),
  ]);

  if (!project) {
    notFound();
  }

  const relatedProjects = relatedList.projects
    .filter((p) => p.slug !== project.slug)
    .slice(0, 3);

  const safeHtml = sanitizeHtmlForRender(project.description);
  const publishedDate = project.publishedAt
    ? new Date(project.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="bg-navy text-white">
      <ReadingProgressBar />

      {/* ================================================================= */}
      {/* 1. CASE STUDY MASTHEAD                                            */}
      {/* ================================================================= */}
      <header className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-white/65 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Projects</span>
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs">
            {project.category?.name && (
              <span className="border border-white/25 px-3 py-1 uppercase tracking-wider text-white">
                {project.category.name}
              </span>
            )}
            {project.featured && (
              <span className="bg-white px-3 py-1 font-bold uppercase tracking-wider text-navy">
                Featured Case Study
              </span>
            )}
            {publishedDate && (
              <span className="inline-flex items-center gap-1.5 text-white/60">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {publishedDate}
              </span>
            )}
          </div>

          <h1 className="mt-6 max-w-4xl text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {project.title}
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl">
            {project.summary}
          </p>

          {(project.liveUrl || project.githubUrl) && (
            <div className="mt-9 flex flex-wrap items-center gap-4">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <span>Launch Live Demo</span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/30 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. HERO SCREENSHOT                                                */}
      {/* ================================================================= */}
      {project.coverImage?.url && (
        <section className="border-b border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
            <div className="relative aspect-video w-full overflow-hidden border border-white/20 bg-navy">
              <Image
                src={project.coverImage.url}
                alt={project.coverImage.alt || project.title}
                fill
                sizes="(max-width: 1152px) 100vw, 1152px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. CASE STUDY BODY + SPECIFICATION SIDEBAR                        */}
      {/* ================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Main Case Study Narrative */}
          <div className="min-w-0 lg:col-span-8">
            {safeHtml && (
              <>
                <div
                  id="project-case-study-body"
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: safeHtml }}
                />
                <ArticleEnhancer containerId="project-case-study-body" />
              </>
            )}

            {/* Multi-Image Gallery (only rendered when images exist) */}
            {project.images && project.images.length > 0 && (
              <div className="mt-14 border-t border-white/15 pt-12">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  Interface &amp; System Gallery
                </p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {project.images.map((img, idx) => (
                    <figure
                      key={img.publicId || `${img.url}-${idx}`}
                      className="border border-white/15 bg-white/[0.015]"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-navy">
                        <Image
                          src={img.url}
                          alt={img.alt || `${project.title} screenshot ${idx + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, 400px"
                          className="object-cover"
                        />
                      </div>
                      {img.alt && (
                        <figcaption className="border-t border-white/10 px-4 py-2.5 font-mono text-[11px] text-white/60">
                          {img.alt}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Technical Specification Sidebar */}
          <aside className="min-w-0 lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <div className="border border-white/15 bg-white/[0.015] p-6">
                <div className="flex items-center gap-2 border-b border-white/15 pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Technical Specifications</span>
                </div>

                <dl className="mt-4 divide-y divide-white/10 font-mono text-xs">
                  {project.category?.name && (
                    <div className="flex items-center justify-between py-3">
                      <dt className="uppercase text-white/50">Category</dt>
                      <dd className="font-semibold text-white">{project.category.name}</dd>
                    </div>
                  )}
                  {publishedDate && (
                    <div className="flex items-center justify-between py-3">
                      <dt className="uppercase text-white/50">Published</dt>
                      <dd className="font-semibold text-white">{publishedDate}</dd>
                    </div>
                  )}
                </dl>

                {project.technologies.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
                      Technology Stack
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="border border-white/20 px-2.5 py-1 font-mono text-[11px] text-white/85"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(project.liveUrl || project.githubUrl) && (
                  <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-between bg-white px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                      >
                        <span>Live Demo</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-between border border-white/25 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-white"
                      >
                        <span>Source Code</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. RELATED PROJECTS                                               */}
      {/* ================================================================= */}
      {relatedProjects.length > 0 && (
        <section className="border-t border-white/15">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="flex items-end justify-between border-b border-white/15 pb-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                  More Engineering Work
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Related Case Studies
                </h2>
              </div>
              <Link
                href="/projects"
                className="font-mono text-xs font-bold uppercase tracking-wider text-white/75 hover:text-white"
              >
                All Projects →
              </Link>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.map((item, idx) => (
                <ProjectCard key={item.id} project={item} index={idx} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
