export type Role = "USER" | "EDITOR" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface ImageRef {
  media?: string;
  url: string;
  publicId: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface UserAvatar {
  url: string;
  publicId: string;
  alt?: string;
}

export interface UserPreferences {
  securityAlerts: boolean;
  emailNotifications: boolean;
}

export interface UserSuspension {
  type: "TEMPORARY" | "PERMANENT";
  reason: string;
  notes?: string;
  suspendedAt: string;
  expiresAt?: string;
  suspendedByEmail?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  pendingEmail?: string;
  avatar?: UserAvatar;
  bio?: string;
  location?: string;
  role: Role;
  emailVerified: boolean;
  status: UserStatus;
  suspension?: UserSuspension;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  preferences?: UserPreferences;
  mfa?: {
    enabled: boolean;
    enabledAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoginActivityItem {
  id: string;
  timestamp: string;
  deviceName: string;
  current: boolean;
}

export interface SessionInfo {
  id: string;
  mfaVerified: boolean;
  ip?: string;
  userAgent?: string;
  deviceName?: string;
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
    verified?: number;
    unverified?: number;
    suspended: number;
    admins: number;
    editors?: number;
    newLast30d?: number;
  };
  messages: {
    total: number;
    unread: number;
  };
  media: {
    total: number;
  };
  emails?: {
    totalCampaigns: number;
  };
  taxonomy?: {
    categories: number;
    tags: number;
  };
}

export type RecipientMode = "SINGLE" | "SELECTED" | "ALL" | "TEST";
export type CampaignStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";

export interface CampaignRecipientItem {
  userId?: string;
  email: string;
  name?: string;
  status: "PENDING" | "SENT" | "FAILED";
  error?: string;
  sentAt?: string;
}

export interface EmailCampaignItem {
  id: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  recipientMode: RecipientMode;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  status: CampaignStatus;
  sender?: { id?: string; name: string; email: string; role?: Role } | string;
  senderEmail: string;
  senderName: string;
  respectMarketingConsent?: boolean;
  recipients?: CampaignRecipientItem[];
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface ModerationLogItem {
  id: string;
  user: string;
  userEmail: string;
  userName: string;
  action: "SUSPENDED" | "REINSTATED" | "AUTO_REINSTATED";
  durationType: "1H" | "24H" | "7D" | "30D" | "PERMANENT" | "MANUAL" | "AUTO";
  reason: string;
  notes?: string;
  expiresAt?: string;
  actorEmail?: string;
  createdAt: string;
}

export interface RetentionSettingsData {
  emailHistoryDays: number;
  auditLogDays: number;
  activityLogDays: number;
  autoCleanupEnabled: boolean;
}

export interface RetentionOverviewData {
  retention: RetentionSettingsData;
  collections: {
    emailCampaigns: number;
    auditLogs: number;
    moderationLogs: number;
    users: number;
    sessions: number;
    blogs: number;
    projects: number;
    contactMessages: number;
    suppressedEmails: number;
  };
}

export interface EmailDeliverabilityReport {
  checkedAt: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    tlsMinVersion: string;
    credentialsConfigured: boolean;
    connectionVerified: boolean;
  };
  sender: {
    fromAddress: string;
    senderDomain: string;
    appDomain: string;
    domainAligned: boolean;
  };
  dns: {
    spf: { status: "VERIFIED" | "MISSING" | "SKIPPED_IN_TEST"; record: string | null };
    dkim: { status: "VERIFIED" | "UNVERIFIED" | "SKIPPED_IN_TEST"; selector: string | null; record: string | null };
    dmarc: { status: "VERIFIED" | "MISSING" | "SKIPPED_IN_TEST"; record: string | null };
  };
  suppression: {
    suppressedCount: number;
    trackedBounceCount: number;
  };
  recommendations: string[];
  caveat: string;
}

export interface SuspiciousActivityData {
  thresholds: {
    failedLoginLockoutThreshold: number;
    otpMaxAttemptsThreshold: number;
    windowMinutes: number;
  };
  summary24h: {
    failedLogins: number;
    unauthorizedAdminAttempts: number;
    accountLockouts: number;
    currentlySuspendedUsers: number;
  };
  events: AuditLogItem[];
}

export interface EmailSuppressionItem {
  id: string;
  email: string;
  failureCount: number;
  suppressed: boolean;
  reason: string;
  lastErrorCategory: string;
  lastFailedAt: string;
  suppressedAt?: string;
}
