/**
 * Public, non-secret site configuration.
 * Only NEXT_PUBLIC_* values may be read here — they are embedded in the client bundle.
 * NEVER put secrets in NEXT_PUBLIC_* variables.
 */
const isProduction = process.env.NODE_ENV === "production";

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (isProduction ? "https://dezaakir.com" : "http://localhost:3000");

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  (isProduction ? "https://v2.dezaakir.com" : "http://localhost:4000");

export const siteConfig = {
  name: "Dezaakir",
  description:
    "Full-stack developer building secure, modern web applications and exploring AI and emerging technology.",
  url: rawSiteUrl.replace(/\/+$/, ""),
  apiUrl: rawApiUrl.replace(/\/+$/, ""),
} as const;
