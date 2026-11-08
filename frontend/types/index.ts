export type Role = "USER" | "ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface ImageRef {
  media?: string;
  url: string;
  publicId: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  status: UserStatus;
  lastLoginAt?: string;
  mfa?: {
    enabled: boolean;
    enabledAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  id: string;
  mfaVerified: boolean;
  ip?: string;
  userAgent?: string;
  lastSeenAt?: string;
  expiresAt: string;
  current?: boolean;
  createdAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  type: "BLOG" | "PROJECT";
  description?: string;
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: ImageRef;
  author?: { id?: string; name: string } | string;
  category?: CategoryItem | null;
  tags: TagItem[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  featured: boolean;
  readingTime: number;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  coverImage?: ImageRef;
  images: ImageRef[];
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  category?: CategoryItem | null;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED";
  order: number;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillItem {
  name: string;
  category: string;
}

export interface ExperienceItem {
  _id?: string;
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface EducationItem {
  _id?: string;
  institution: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface SiteSettingsData {
  siteTitle: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  biography: string;
  profileImage?: ImageRef;
  cvUrl?: string;
  location?: string;
  socialLinks: {
    github?: string;
    linkedin?: string;
    x?: string;
    youtube?: string;
    website?: string;
    email?: string;
  };
  skills: SkillItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  careerInterests: string[];
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    ogImage?: ImageRef;
  };
}

export interface ContactMessageItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "NEW" | "READ" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  publicId: string;
  url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  alt: string;
  caption?: string;
  folder: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  category: "AUTH" | "ADMIN" | "SECURITY" | "SYSTEM";
  action: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
