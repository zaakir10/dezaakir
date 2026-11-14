"use client";

import { ArrowUp } from "lucide-react";

export function BackToTopButton() {
  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      aria-label="Back to top"
      className="inline-flex items-center gap-2 border border-white/20 px-3.5 py-2 font-mono text-[11px] uppercase tracking-widest text-white/75 transition hover:border-white hover:bg-white hover:text-navy"
    >
      <span>Back to Top</span>
      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
