import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[65dvh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Error 404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/75">
        The page or article you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-xs font-semibold text-navy transition hover:bg-white/90"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Return to Homepage
      </Link>
    </main>
  );
}
