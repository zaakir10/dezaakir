import { siteConfig } from "./site";
import type {
  BlogArticle,
  CategoryItem,
  PaginationMeta,
  ProjectItem,
  SiteSettingsData,
  TagItem,
} from "@/types";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let currentCsrfToken: string | null = null;

export function setClientCsrfToken(token: string | null): void {
  currentCsrfToken = token;
}

export function getClientCsrfToken(): string | null {
  return currentCsrfToken;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { csrfToken?: string | null } = {},
): Promise<ApiSuccess<T>> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = options.csrfToken ?? currentCsrfToken;
  if (MUTATING_METHODS.has(method) && token) {
    headers.set("X-CSRF-Token", token);
  }

  const url = path.startsWith("http") ? path : `${siteConfig.apiUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  const body = payload as {
    success?: boolean;
    data?: T;
    meta?: PaginationMeta;
    error?: { code?: string; message?: string; details?: unknown };
  } | null;

  if (!res.ok || !body?.success) {
    const detailsList = Array.isArray(body?.error?.details)
      ? (body?.error?.details as { path?: string; message?: string }[])
          .map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))
          .filter(Boolean)
          .join(" · ")
      : "";
    const baseMessage = body?.error?.message ?? "Request failed";
    throw new ApiClientError(
      res.status,
      body?.error?.code ?? "REQUEST_FAILED",
      detailsList ? `${baseMessage} (${detailsList})` : baseMessage,
      body?.error?.details,
    );
  }

  return { data: body.data as T, meta: body.meta };
}

// ── Default fallback data when the database has not been seeded yet ──────────

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  siteTitle: "Dezaakir",
  tagline: "Full-Stack Development · Artificial Intelligence · Modern Systems",
  heroTitle: "Engineering secure, high-precision web platforms & AI systems.",
  heroDescription:
    "I am Dezaakir — a software engineer focused on full-stack TypeScript architecture, defense-in-depth application security, and applied artificial intelligence.",
  biography:
    "I design and build production web applications from database schema to user interface. My work focuses on modern full-stack engineering with Next.js, Bun, Node.js, TypeScript, and MongoDB, paired with rigorous OWASP ASVS security standards and practical AI integration.\n\nBeyond building software, I publish in-depth programming tutorials and architectural breakdowns to help engineers write cleaner, safer, and more resilient code.",
  location: "Remote · Global",
  cvUrl: "/dezaakir-cv.pdf",
  socialLinks: {
    github: "https://github.com/dezaakir",
    linkedin: "https://linkedin.com/in/dezaakir",
    x: "https://x.com/dezaakir",
  },
  skills: [
    { name: "TypeScript (Strict)", category: "Languages" },
    { name: "JavaScript (ES2023+)", category: "Languages" },
    { name: "Python", category: "Languages" },
    { name: "SQL & NoSQL", category: "Languages" },
    { name: "Next.js (App Router)", category: "Frontend" },
    { name: "React 19", category: "Frontend" },
    { name: "Tailwind CSS", category: "Frontend" },
    { name: "Framer Motion", category: "Frontend" },
    { name: "Bun & Node.js", category: "Backend" },
    { name: "Express 5 REST APIs", category: "Backend" },
    { name: "MongoDB & Mongoose", category: "Backend" },
    { name: "Zod Validation", category: "Backend" },
    { name: "OWASP ASVS Level 2", category: "Security & AI" },
    { name: "Argon2id / TOTP MFA / CSRF", category: "Security & AI" },
    { name: "LLM Integration & Agents", category: "Security & AI" },
    { name: "Cloudinary & Vercel", category: "Security & AI" },
  ],
  experience: [
    {
      role: "Senior Full-Stack & AI Engineer",
      company: "Dezaakir Studio",
      location: "Remote",
      startDate: "2024-01-01T00:00:00.000Z",
      current: true,
      description:
        "Architecting full-stack web platforms, AI-assisted developer workflows, and hardened authentication and publishing systems with Next.js, Bun, Express, and MongoDB Atlas.",
    },
    {
      role: "Full-Stack Software Developer",
      company: "Modern Web Systems",
      location: "Remote",
      startDate: "2022-03-01T00:00:00.000Z",
      endDate: "2023-12-31T00:00:00.000Z",
      current: false,
      description:
        "Delivered responsive SaaS dashboards, RESTful APIs, role-based access control, and automated testing pipelines.",
    },
  ],
  education: [
    {
      institution: "University of Technology & Computer Science",
      degree: "Bachelor of Science",
      field: "Computer Science & Software Engineering",
      startDate: "2019-09-01T00:00:00.000Z",
      endDate: "2023-06-01T00:00:00.000Z",
      description:
        "Focused on distributed systems, cryptography, database architecture, and machine learning foundations.",
    },
  ],
  careerInterests: [
    "Full-Stack TypeScript Architecture",
    "Applied AI & Intelligent Agents",
    "Application Security (OWASP ASVS)",
    "High-Performance Edge & Cloud Systems",
    "Developer Tooling & Technical Writing",
  ],
  seo: {
    defaultTitle: "Dezaakir — Full-Stack Developer & Technology Publication",
    defaultDescription:
      "Portfolio and technology blog of Dezaakir: full-stack engineering, AI systems, and modern web security.",
  },
};

export async function fetchPublicSettings(): Promise<SiteSettingsData> {
  try {
    const res = await fetch(`${siteConfig.apiUrl}/api/settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_SITE_SETTINGS;
    const json = (await res.json()) as { success?: boolean; data?: { settings?: Partial<SiteSettingsData> } };
    const remote = json.data?.settings;
    if (!remote) return DEFAULT_SITE_SETTINGS;
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...remote,
      skills: remote.skills && remote.skills.length > 0 ? remote.skills : DEFAULT_SITE_SETTINGS.skills,
      experience:
        remote.experience && remote.experience.length > 0 ? remote.experience : DEFAULT_SITE_SETTINGS.experience,
      education:
        remote.education && remote.education.length > 0 ? remote.education : DEFAULT_SITE_SETTINGS.education,
      careerInterests:
        remote.careerInterests && remote.careerInterests.length > 0
          ? remote.careerInterests
          : DEFAULT_SITE_SETTINGS.careerInterests,
      socialLinks: { ...DEFAULT_SITE_SETTINGS.socialLinks, ...(remote.socialLinks ?? {}) },
      seo: { ...DEFAULT_SITE_SETTINGS.seo, ...(remote.seo ?? {}) },
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function fetchPublicProjects(params?: {
  page?: number;
  limit?: number;
  category?: string;
  featured?: boolean;
  search?: string;
}): Promise<{
  projects: ProjectItem[];
  categories: CategoryItem[];
  meta: PaginationMeta;
}> {
  try {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.category) qs.set("category", params.category);
    if (params?.featured !== undefined) qs.set("featured", String(params.featured));
    if (params?.search) qs.set("search", params.search);
    const queryStr = qs.toString() ? `?${qs.toString()}` : "";

    const res = await fetch(`${siteConfig.apiUrl}/api/projects${queryStr}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return { projects: [], categories: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    }
    const json = (await res.json()) as {
      data?: { projects?: ProjectItem[]; categories?: CategoryItem[] };
      meta?: PaginationMeta;
    };
    return {
      projects: json.data?.projects ?? [],
      categories: json.data?.categories ?? [],
      meta: json.meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  } catch {
    return { projects: [], categories: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };
  }
}

export async function fetchPublicProjectBySlug(slug: string): Promise<ProjectItem | null> {
  try {
    const res = await fetch(`${siteConfig.apiUrl}/api/projects/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { project?: ProjectItem } };
    return json.data?.project ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublicBlogs(params?: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  featured?: boolean;
  search?: string;
}): Promise<{
  blogs: BlogArticle[];
  categories: CategoryItem[];
  tags: TagItem[];
  meta: PaginationMeta;
}> {
  try {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.category) qs.set("category", params.category);
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.featured !== undefined) qs.set("featured", String(params.featured));
    if (params?.search) qs.set("search", params.search);
    const queryStr = qs.toString() ? `?${qs.toString()}` : "";

    const res = await fetch(`${siteConfig.apiUrl}/api/blogs${queryStr}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return { blogs: [], categories: [], tags: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    }
    const json = (await res.json()) as {
      data?: { blogs?: BlogArticle[]; categories?: CategoryItem[]; tags?: TagItem[] };
      meta?: PaginationMeta;
    };
    return {
      blogs: json.data?.blogs ?? [],
      categories: json.data?.categories ?? [],
      tags: json.data?.tags ?? [],
      meta: json.meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  } catch {
    return { blogs: [], categories: [], tags: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };
  }
}

export async function fetchPublicBlogBySlug(
  slug: string,
): Promise<{ blog: BlogArticle; related: BlogArticle[] } | null> {
  try {
    const res = await fetch(`${siteConfig.apiUrl}/api/blogs/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { blog?: BlogArticle; related?: BlogArticle[] } };
    if (!json.data?.blog) return null;
    return { blog: json.data.blog, related: json.data.related ?? [] };
  } catch {
    return null;
  }
}
