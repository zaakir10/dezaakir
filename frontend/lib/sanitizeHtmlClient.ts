/**
 * Defence-in-depth HTML sanitizer executed on the frontend before rendering
 * any rich-text article or project description.
 * Never renders <script>, <style>, <iframe>, <svg>, <object>, event handlers, or javascript: URLs.
 */
const BLOCKED_CONTAINERS =
  /<(script|style|iframe|object|embed|svg|math|applet|frame|frameset|noscript|template|textarea|title|form)\b[^>]*>[\s\S]*?<\/\1>/gi;
const BLOCKED_TAGS =
  /<(script|style|iframe|object|embed|svg|math|applet|frame|frameset|meta|link|base|form|input|button|select|option)\b[^>]*\/?>/gi;

export function sanitizeHtmlForRender(html: string): string {
  if (!html) return "";
  return html
    .replace(/\u0000/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(BLOCKED_CONTAINERS, "")
    .replace(BLOCKED_TAGS, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "");
}
