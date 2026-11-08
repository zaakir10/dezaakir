import { siteConfig } from "@/lib/site";

/**
 * Phase 1 foundation page: verifies fonts, brand tokens and layout render correctly.
 * The full homepage (hero, skills, projects, blog, contact) is built in Phase 5.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6">
      <p className="font-mono text-sm tracking-widest text-white/60 uppercase">Full-Stack · AI · Modern Tech</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">{siteConfig.name}</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{siteConfig.description}</p>
      <div className="mt-10 h-px w-24 bg-white/20" />
    </main>
  );
}
