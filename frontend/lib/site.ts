/**
 * Public, non-secret site configuration.
 * Only NEXT_PUBLIC_* values may be read here — they are embedded in the client bundle.
 * NEVER put secrets in NEXT_PUBLIC_* variables.
 */
export const siteConfig = {
  name: "Dezaakir",
  description:
    "Full-stack developer building secure, modern web applications and exploring AI and emerging technology.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
} as const;
