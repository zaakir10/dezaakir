"use client";

import { useEffect } from "react";

/**
 * Progressively enhances `<pre><code>` blocks inside `.article-content` with a
 * subtle language badge and a one-click Copy button using strict brand tokens.
 */
export function ArticleEnhancer({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const preElements = Array.from(container.querySelectorAll("pre"));
    const cleanups: Array<() => void> = [];

    for (const pre of preElements) {
      if (pre.dataset.enhanced === "true") continue;
      pre.dataset.enhanced = "true";

      const codeEl = pre.querySelector("code");
      const rawClass = codeEl?.className ?? "";
      const langMatch = rawClass.match(/language-([a-z0-9_-]+)/i);
      const language = langMatch?.[1]?.toUpperCase() || "CODE";

      const wrapper = document.createElement("div");
      wrapper.className =
        "my-7 border border-white/20 bg-white/[0.02] overflow-hidden";

      const toolbar = document.createElement("div");
      toolbar.className =
        "flex items-center justify-between border-b border-white/15 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/60";

      const langLabel = document.createElement("span");
      langLabel.textContent = language;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.className =
        "border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 transition hover:border-white hover:bg-white hover:text-navy";

      let timer: number | undefined;
      const onClick = async () => {
        try {
          const text = codeEl?.textContent ?? pre.textContent ?? "";
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = "Copied";
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2000);
        } catch {
          // ignore clipboard denial
        }
      };

      copyBtn.addEventListener("click", onClick);
      cleanups.push(() => {
        copyBtn.removeEventListener("click", onClick);
        window.clearTimeout(timer);
      });

      toolbar.appendChild(langLabel);
      toolbar.appendChild(copyBtn);

      pre.style.margin = "0";
      pre.style.border = "none";
      pre.style.background = "transparent";

      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(toolbar);
      wrapper.appendChild(pre);
    }

    return () => {
      for (const fn of cleanups) fn();
    };
  }, [containerId]);

  return null;
}
