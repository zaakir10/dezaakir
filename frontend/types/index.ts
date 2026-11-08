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
  usageCount?: number;
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  usageCount?: number;
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
  authorName?: string;
  heroTitle: string;
  heroDescription: string;
  biography: string;
  profileImage?: ImageRef;
  cvUrl?: string;
  location?: string;
  socialLinks: {
    github?: string;
    facebook?: string;
    tiktok?: string;
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

export interface OverviewStats {
  blogs: {
    total: number;
    published: number;
    drafts: number;
    scheduled: number;
  };
  projects: {
    total: number;
    published: number;
    drafts: number;
  };
  users: {
    total: number;
    active: number;
    suspended: number;
    admins: number;
  };
  messages: {
    total: number;
    unread: number;
  };
  media: {
    total: number;
  };
  taxonomy?: {
    categories: number;
    tags: number;
  };
}

export interface PeriodComparison {
  last30Days: number;
  prev30Days: number;
}

export interface OverviewComparisons {
  blogsCreated: PeriodComparison;
  blogsPublished: PeriodComparison;
  projectsCreated: PeriodComparison;
  usersRegistered: PeriodComparison;
  messagesReceived: PeriodComparison;
}

export interface MonthlySeriesPoint {
  key: string;
  label: string;
  blogsTotal: number;
  blogsPublished: number;
  projectsTotal: number;
  projectsPublished: number;
  usersRegistered: number;
  messagesReceived: number;
}

export interface SystemStatusInfo {
  emailConfigured: boolean;
  emailFrom: string;
  cloudinaryConfigured: boolean;
  cloudinaryCloudName: string | null;
  environment: string;
}

export interface AdminOverviewData {
  stats: OverviewStats;
  comparisons?: OverviewComparisons;
  monthlySeries?: MonthlySeriesPoint[];
  recentBlogs?: Array<{
    id: string;
    title: string;
    slug: string;
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
    readingTime?: number;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  recentProjects?: Array<{
    id: string;
    title: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    featured: boolean;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  recentUsers?: Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    emailVerified: boolean;
    lastLoginAt?: string;
    createdAt: string;
  }>;
  recentMessages?: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    status: "NEW" | "READ" | "ARCHIVED";
    createdAt: string;
  }>;
  recentActivity: AuditLogItem[];
  systemStatus?: SystemStatusInfo;
}
