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
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.sessionStorage.setItem("dezaakir_csrf", token);
      } else {
        window.sessionStorage.removeItem("dezaakir_csrf");
      }
    } catch {
      // ignore storage errors
    }
  }
}

export function getClientCsrfToken(): string | null {
  if (currentCsrfToken) return currentCsrfToken;
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem("dezaakir_csrf");
      if (stored) {
        currentCsrfToken = stored;
        return stored;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function refreshCsrfTokenFromSession(): Promise<string | null> {
  try {
    const res = await fetch(`${siteConfig.apiUrl}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { csrfToken?: string } };
    const token = json?.data?.csrfToken ?? null;
    if (token) {
      setClientCsrfToken(token);
    }
    return token;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { csrfToken?: string | null; _retriedCsrf?: boolean } = {},
): Promise<ApiSuccess<T>> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let token = options.csrfToken ?? getClientCsrfToken();
  if (MUTATING_METHODS.has(method) && !token && !path.startsWith("/api/auth/login")) {
    token = await refreshCsrfTokenFromSession();
  }
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

  // Automatically recover once if the in-memory CSRF token is out of sync with the session cookie
  if (
    res.status === 403 &&
    body?.error?.code === "CSRF_TOKEN_INVALID" &&
    MUTATING_METHODS.has(method) &&
    !options._retriedCsrf
  ) {
    const freshToken = await refreshCsrfTokenFromSession();
    if (freshToken) {
      return apiRequest<T>(path, { ...options, csrfToken: freshToken, _retriedCsrf: true });
    }
  }

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

export const apiFetch = apiRequest;

export async function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function apiUploadMediaFile<T = { media: import("@/types").MediaItem }>(
  file: File,
  options: {
    folder: "blogs" | "projects" | "profile" | "general";
    alt: string;
    caption?: string;
  }
): Promise<ApiSuccess<T>> {
  const fileBase64 = await fileToBase64DataUrl(file);
  return apiRequest<T>("/api/admin/media/upload", {
    method: "POST",
    body: JSON.stringify({
      fileBase64,
      mimeType: file.type || "image/png",
      folder: options.folder,
      alt: options.alt || file.name,
      caption: options.caption,
    }),
  });
}

// ── Default fallback data when the database has not been seeded yet ──────────

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  siteTitle: "Dezaakir",
  authorName: "Dezaakir",
  tagline: "Full-Stack Software Engineer · Modern Web Architecture · Emerging Technologies",
  heroTitle: "Building Digital Experiences Through Code & Technology.",
  heroDescription:
    "I'm a software developer passionate about building modern web applications, solving real-world problems, and exploring emerging technologies.",
  biography:
    "I design and build production web applications from database schema to user interface. My work focuses on modern full-stack engineering with Next.js, Bun, Node.js, TypeScript, and MongoDB, paired with rigorous OWASP ASVS security standards and practical AI integration.\n\nBeyond building software, I publish in-depth programming tutorials and architectural breakdowns to help engineers write cleaner, safer, and more resilient code.",
  location: "Remote · Global",
  cvUrl: "/dezaakir-cv.pdf",
  socialLinks: {
    github: "https://github.com/dezaakir",
    facebook: "https://facebook.com/dezaakir",
    tiktok: "https://tiktok.com/@dezaakir",
    linkedin: "https://linkedin.com/in/dezaakir",
    x: "https://x.com/dezaakir",
  },
  skills: [
    { name: "Next.js (App Router)", category: "Frontend Development" },
    { name: "React 19", category: "Frontend Development" },
    { name: "Tailwind CSS", category: "Frontend Development" },
    { name: "Responsive UI Systems", category: "Frontend Development" },
    { name: "Bun & Node.js", category: "Backend Development" },
    { name: "Express 5 REST APIs", category: "Backend Development" },
    { name: "Zod Schema Validation", category: "Backend Development" },
    { name: "OWASP ASVS Security", category: "Backend Development" },
    { name: "MongoDB Atlas", category: "Databases" },
    { name: "Mongoose ODM", category: "Databases" },
    { name: "PostgreSQL & SQL", category: "Databases" },
    { name: "Data Modeling & Indexing", category: "Databases" },
    { name: "TypeScript (Strict)", category: "Programming Languages" },
    { name: "JavaScript (ES2024+)", category: "Programming Languages" },
    { name: "Python", category: "Programming Languages" },
    { name: "HTML5 & CSS3", category: "Programming Languages" },
    { name: "Cloud Deployment & Vercel", category: "Networking and Infrastructure" },
    { name: "HTTP/TLS & CORS Hardening", category: "Networking and Infrastructure" },
    { name: "Cloudinary Media CDN", category: "Networking and Infrastructure" },
    { name: "Session & CSRF Architecture", category: "Networking and Infrastructure" },
    { name: "Git & GitHub", category: "Development Tools" },
    { name: "Linux & Shell Automation", category: "Development Tools" },
    { name: "Automated Testing", category: "Development Tools" },
    { name: "AI & LLM Workflows", category: "Development Tools" },
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
