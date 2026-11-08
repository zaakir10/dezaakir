import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { fetchPublicProjectBySlug } from "@/lib/api";
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
      images: project.coverImage?.url ? [{ url: project.coverImage.url, alt: project.title }] : undefined,
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
  const project = await fetchPublicProjectBySlug(slug);
  if (!project) {
    notFound();
  }

  const safeHtml = sanitizeHtmlForRender(project.description);
  const publishedDate = project.publishedAt
    ? new Date(project.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 font-mono text-xs text-white/70 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Projects
      </Link>

      <header className="mt-6 border-b border-white/15 pb-10">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-white/70">
          {project.category?.name && (
            <span className="rounded border border-white/20 px-2.5 py-0.5 text-white">{project.category.name}</span>
          )}
          {project.featured && <span className="rounded bg-white px-2.5 py-0.5 font-semibold text-navy">Featured</span>}
          {publishedDate && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {publishedDate}
            </span>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{project.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-white/80">{project.summary}</p>

        {/* Technologies */}
        {project.technologies.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <span
                key={tech}
                className="rounded border border-white/20 bg-white/5 px-3 py-1 font-mono text-xs text-white"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Repository & Live Demo Links */}
        {(project.githubUrl || project.liveUrl) && (
          <div className="mt-8 flex flex-wrap gap-4">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-white/90"
              >
                Live Demonstration <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                GitHub Repository <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </header>

      {/* Main Cover Image */}
      {project.coverImage?.url && (
        <div className="relative mt-10 aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-navy">
          <Image
            src={project.coverImage.url}
            alt={project.coverImage.alt || project.title}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Sanitized Rich Description */}
      <section
        className="article-content mt-10"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      {/* Multiple Screenshots Gallery */}
      {project.images && project.images.length > 0 && (
        <section className="mt-16 border-t border-white/15 pt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Project Screenshots</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {project.images.map((img, index) => (
              <figure
                key={`${img.publicId}-${index}`}
                className="overflow-hidden rounded-lg border border-white/15 bg-white/[0.03]"
              >
                <div className="relative aspect-video w-full bg-navy">
                  <Image
                    src={img.url}
                    alt={img.alt || `${project.title} screenshot ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 440px"
                    className="object-cover"
                  />
                </div>
                {img.alt && <figcaption className="p-3 font-mono text-xs text-white/70">{img.alt}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
