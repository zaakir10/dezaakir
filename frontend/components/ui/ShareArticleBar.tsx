"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";

export function ShareArticleBar({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-white/15 bg-white/[0.02] px-5 py-3.5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-white/70">
        <Share2 className="h-3.5 w-3.5 text-white" />
        <span>Share Article</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 border border-white/25 bg-navy px-3 py-1.5 text-white transition hover:border-white hover:bg-white hover:text-navy"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Link Copied" : "Copy Link"}</span>
        </button>

        <a
          href={`https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 border border-white/20 px-3 py-1.5 text-white/80 transition hover:border-white hover:text-white"
        >
          <span>X / Twitter</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 border border-white/20 px-3 py-1.5 text-white/80 transition hover:border-white hover:text-white"
        >
          <span>LinkedIn</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 border border-white/20 px-3 py-1.5 text-white/80 transition hover:border-white hover:text-white"
        >
          <span>Facebook</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
