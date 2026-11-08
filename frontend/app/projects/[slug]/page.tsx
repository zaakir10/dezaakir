import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Code2, ExternalLink, Layers } from "lucide-react";
import { ProjectCard } from "@/components/ui/ProjectCard";
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
      {/* Header & Case Study Masthead */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Projects</span>
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs">
            {project.category?.name && (
              <span className="border border-white/25 px-3 py-1 uppercase text-white">
                {project.category.name}
              </span>
            )}
            {project.featured && (
              <span className="bg-white px-3 py-1 font-bold uppercase text-navy">
                Featured Case Study
              </span>
            )}
            {publishedDate && (
              <span className="inline-flex items-center gap-1.5 text-white/65">
                <Calendar className="h-3.5 w-3.5" />
                {publishedDate}
              </span>
            )}
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {project.title}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/80">
            {project.summary}
          </p>

          {/* Primary Action Links */}
          {(project.liveUrl || project.githubUrl) && (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                >
                  <span>Launch Live Demo</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/30 bg-white/[0.03] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Cover Image */}
      {project.coverImage?.url && (
        <section className="border-b border-white/15 bg-white/[0.01]">
          <div className="mx-auto max-w-6xl px-6 py-10">
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

      {/* Case Study Content + Technical Sidebar */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Full Description & Key Features */}
          <div className="lg:col-span-8">
            <h2 className="border-b border-white/15 pb-3 font-mono text-xs font-bold uppercase tracking-widest text-white/60">
              Project Overview & Architecture
            </h2>
            <div
              className="article-content mt-6"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          </div>

          {/* Technical Specification Sidebar */}
          <aside className="space-y-6 lg:col-span-4">
            <div className="border border-white/15 bg-white/[0.02] p-6">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-white">
                <Layers className="h-4 w-4" />
                <span>Technology Stack</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="border border-white/20 bg-navy px-3 py-1.5 font-mono text-xs text-white"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-white/15 bg-white/[0.02] p-6">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-white">
                <Code2 className="h-4 w-4" />
                <span>Project Links & Access</span>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                {project.liveUrl ? (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border border-white/25 bg-white px-4 py-3 font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
                  >
                    <span>Live Deployment</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="font-mono text-white/55">No public live URL configured.</p>
                )}

                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border border-white/25 bg-navy px-4 py-3 font-semibold uppercase tracking-wider text-white transition hover:border-white"
                  >
                    <span>Source Code (GitHub)</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Multiple Project Screenshots Gallery */}
        {project.images && project.images.length > 0 && (
          <div className="mt-20 border-t border-white/15 pt-16">
            <p className="font-mono text-xs uppercase tracking-widest text-white/55">
              Visual Walkthrough
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Project Screenshots ({project.images.length})
            </h2>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {project.images.map((img, index) => (
                <figure
                  key={`${img.publicId}-${index}`}
                  className="overflow-hidden border border-white/15 bg-white/[0.02]"
                >
                  <div className="relative aspect-video w-full bg-navy">
                    <Image
                      src={img.url}
                      alt={img.alt || `${project.title} screenshot ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 560px"
                      className="object-cover"
                    />
                  </div>
                  {img.alt && (
                    <figcaption className="border-t border-white/10 px-4 py-3 font-mono text-xs text-white/70">
                      {img.alt}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <div className="mt-20 border-t border-white/15 pt-16">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-white/55">
                  Continue Exploring
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Related Projects
                </h2>
              </div>
              <Link
                href="/projects"
                className="font-mono text-xs uppercase tracking-wider text-white/75 hover:text-white"
              >
                All Projects →
              </Link>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {relatedProjects.map((rel, idx) => (
                <ProjectCard key={rel.id} project={rel} index={idx} />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
