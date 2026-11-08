/**
 * Strict, allow-list HTML sanitizer for rich text (Blog & Project descriptions)
 * and plain-text XSS neutralizer for user-submitted text fields.
 *
 * Designed to neutralize stored, reflected, and DOM-based XSS payloads:
 * - Strips dangerous containers (<script>, <style>, <iframe>, <svg>, <math>, <object>, <embed>, <form>, etc.)
 *   along with their inner contents where appropriate.
 * - Allows only a curated set of editorial tags and attributes.
 * - Validates URLs on `href` and `src` (blocks `javascript:`, `vbscript:`, `data:`).
 */

const BLOCKED_CONTAINER_TAGS =
  /<(script|style|iframe|object|embed|svg|math|applet|frame|frameset|noscript|template|textarea|title|xmp)\b[^>]*>[\s\S]*?<\/\1>/gi;

const BLOCKED_STANDALONE_TAGS =
  /<(script|style|iframe|object|embed|svg|math|applet|frame|frameset|meta|link|base|form|input|button|select|option)\b[^>]*\/?>/gi;

const ALLOWED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "pre",
  "code",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "figure",
  "figcaption",
  "span",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

export function escapeHtmlEntities(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHref(raw: string): boolean {
  const decoded = raw
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/[\u0000-\u0020]+/g, "")
    .trim();

  if (!decoded) return false;
  if (decoded.startsWith("/") && !decoded.startsWith("//")) return true;
  if (decoded.startsWith("#")) return true;

  try {
    const parsed = new URL(decoded);
    return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}

function isSafeImageSrc(raw: string): boolean {
  const decoded = raw.replace(/[\u0000-\u0020]+/g, "").trim();
  try {
    const parsed = new URL(decoded);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeAttributes(tag: string, rawAttrs: string): string {
  const attrRegex = /([a-zA-Z0-9:-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  const kept: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const name = match[1]!.toLowerCase();
    const val = (match[2] ?? match[3] ?? match[4] ?? "").trim();

    // Never allow event handlers (onclick, onerror, onload, etc.) or inline styles
    if (name.startsWith("on") || name === "style" || name === "srcdoc" || name === "formaction") {
      continue;
    }

    if (tag === "a" && name === "href") {
      if (isSafeHref(val)) {
        kept.push(`href="${escapeHtmlEntities(val)}"`);
        kept.push(`rel="noopener noreferrer"`);
      }
      continue;
    }

    if (tag === "a" && name === "target" && val === "_blank") {
      kept.push(`target="_blank"`);
      continue;
    }

    if (tag === "img") {
      if (name === "src" && isSafeImageSrc(val)) {
        kept.push(`src="${escapeHtmlEntities(val)}"`);
      } else if (name === "alt") {
        kept.push(`alt="${escapeHtmlEntities(val.slice(0, 200))}"`);
      } else if ((name === "width" || name === "height") && /^\d{1,5}$/.test(val)) {
        kept.push(`${name}="${val}"`);
      }
      continue;
    }

    if ((tag === "code" || tag === "pre") && name === "class") {
      const safeClass = val
        .split(/\s+/)
        .filter((c) => /^language-[a-z0-9_-]{1,30}$/i.test(c))
        .join(" ");
      if (safeClass) {
        kept.push(`class="${safeClass}"`);
      }
      continue;
    }

    if ((tag === "th" || tag === "td") && (name === "colspan" || name === "rowspan") && /^[1-9]\d?$/.test(val)) {
      kept.push(`${name}="${val}"`);
    }
  }

  if (tag === "img" && !kept.some((a) => a.startsWith("src="))) {
    return "__DROP_TAG__";
  }

  return kept.length > 0 ? " " + Array.from(new Set(kept)).join(" ") : "";
}

/**
 * Sanitizes rich HTML content from the TipTap editor against an explicit allow-list.
 */
export function sanitizeRichHtml(dirty: string): string {
  if (!dirty) return "";

  let html = dirty
    .replace(/\u0000/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(BLOCKED_CONTAINER_TAGS, "")
    .replace(BLOCKED_STANDALONE_TAGS, "");

  html = html.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g, (_full, rawTag: string, rawAttrs: string) => {
    const isClosing = _full.startsWith("</");
    const tag = rawTag.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (isClosing) {
      return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
    }

    const cleanAttrs = sanitizeAttributes(tag, rawAttrs);
    if (cleanAttrs === "__DROP_TAG__") return "";

    return VOID_TAGS.has(tag) ? `<${tag}${cleanAttrs} />` : `<${tag}${cleanAttrs}>`;
  });

  return html.trim();
}

/**
 * Neutralizes HTML/XSS in plain-text fields (names, subjects, contact messages)
 * by stripping null bytes and escaping HTML special characters.
 */
export function sanitizePlainText(input: string): string {
  return escapeHtmlEntities(input.replace(/\u0000/g, "").trim());
}
