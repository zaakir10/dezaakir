"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  FolderKanban,
  Globe,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/features/auth/AuthContext";
import {
  AdminCategoriesView,
  AdminMediaLibraryView,
  AdminTagsView,
  slugifyText,
} from "@/features/admin/AdminManagementViews";
import {
  AdminAdvancedMessagesView,
  AdminAdvancedUsersView,
  AdminEmailCenterView,
  AdminEmailHistoryView,
  AdminRolesPermissionsView,
  AdminSecurityCenterView,
  AdminTaxonomyCombinedView,
  type UsersSummaryCounts,
} from "@/features/admin/AdminEnterpriseViews";
import {
  AdminAnalyticsView,
  AdminAuditLogsView,
  AdminSeoSettingsView,
  AdminSiteSettingsView,
} from "@/features/admin/AdminSystemViews";
import {
  BarChartCard,
  ConfirmDialog,
  type ConfirmDialogState,
  EmptyState,
  MediaPickerModal,
  PaginationBar,
  TableSkeleton,
  type ToastItem,
  ToastStack,
} from "@/features/admin/AdminUI";
import { apiFetch, apiUploadMediaFile } from "@/lib/api";
import type {
  AdminOverviewData,
  AuditLogItem,
  BlogArticle,
  CategoryItem,
  ContactMessageItem,
  EmailCampaignItem,
  ImageRef,
  MediaItem,
  PaginationMeta,
  ProjectItem,
  Role,
  SessionInfo,
  SiteSettingsData,
  TagItem,
  User,
} from "@/types";

export type AdminNavSection =
  | "dashboard"
  | "blogs"
  | "projects"
  | "taxonomy"
  | "categories"
  | "tags"
  | "media"
  | "users"
  | "roles"
  | "messages"
  | "emailCenter"
  | "emailHistory"
  | "analytics"
  | "settings"
  | "seo"
  | "security"
  | "audit";

const DEFAULT_META: PaginationMeta = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};

export function AdminDashboard() {
  const router = useRouter();
  const { user: currentAdmin, logout } = useAuth();

  // Shell & Navigation State
  const [activeSection, setActiveSection] = useState<AdminNavSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Toasts & Confirmation Dialog
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const pushToast = useCallback(
    (type: "success" | "error" | "info", title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const askConfirm = (config: Omit<ConfirmDialogState, "open">) => {
    setConfirmState({ ...config, open: true });
  };

  // Media Picker Modal State
  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    null | "blogCover" | "projectThumb" | "projectScreenshot" | "profile" | "og"
  >(null);

  // Core Data Collections
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [blogsMeta, setBlogsMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsMeta, setProjectsMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [messages, setMessages] = useState<ContactMessageItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SiteSettingsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditMeta, setAuditMeta] = useState<PaginationMeta>(DEFAULT_META);

  // Loading Flags
  const [initialLoading, setInitialLoading] = useState(true);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Blog Listing Filters & Bulk Selection
  const [blogSearch, setBlogSearch] = useState("");
  const [blogStatusFilter, setBlogStatusFilter] = useState("");
  const [blogCategoryFilter, setBlogCategoryFilter] = useState("");
  const [blogSort, setBlogSort] = useState<"newest" | "oldest" | "title">("newest");
  const [blogPage, setBlogPage] = useState(1);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);

  // Blog Editor State
  const [blogEditorOpen, setBlogEditorOpen] = useState(false);
  const [blogEditorMode, setBlogEditorMode] = useState<"write" | "preview">("write");
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogSlug, setBlogSlug] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogContent, setBlogContent] = useState("<p>Write your technical article here...</p>");
  const [blogCoverImage, setBlogCoverImage] = useState<ImageRef | undefined>(undefined);
  const [blogCategoryId, setBlogCategoryId] = useState("");
  const [blogSelectedTagIds, setBlogSelectedTagIds] = useState<string[]>([]);
  const [blogStatus, setBlogStatus] = useState<"DRAFT" | "PUBLISHED" | "SCHEDULED">("DRAFT");
  const [blogScheduledAt, setBlogScheduledAt] = useState("");
  const [blogFeatured, setBlogFeatured] = useState(false);
  const [blogSeoTitle, setBlogSeoTitle] = useState("");
  const [blogSeoDescription, setBlogSeoDescription] = useState("");

  // Project Listing Filters
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("");
  const [projectCategoryFilter, setProjectCategoryFilter] = useState("");
  const [projectSort, setProjectSort] = useState<"newest" | "oldest" | "title">("newest");
  const [projectPage, setProjectPage] = useState(1);

  // Project Editor State
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [projectDescription, setProjectDescription] = useState(
    "<p>Describe the architecture, engineering trade-offs, and outcomes...</p>"
  );
  const [projectCoverImage, setProjectCoverImage] = useState<ImageRef | undefined>(undefined);
  const [projectScreenshots, setProjectScreenshots] = useState<ImageRef[]>([]);
  const [projectTechInput, setProjectTechInput] = useState("TypeScript, Next.js, Bun, MongoDB");
  const [projectGithubUrl, setProjectGithubUrl] = useState("");
  const [projectLiveUrl, setProjectLiveUrl] = useState("");
  const [projectCategoryId, setProjectCategoryId] = useState("");
  const [projectStatus, setProjectStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");
  const [projectFeatured, setProjectFeatured] = useState(false);
  const [projectOrder, setProjectOrder] = useState(0);
  const [projectSeoTitle, setProjectSeoTitle] = useState("");
  const [projectSeoDescription, setProjectSeoDescription] = useState("");

  // Media Filters & Upload State
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaFolderFilter, setMediaFolderFilter] = useState("");
  const [uploadFolder, setUploadFolder] = useState<"blogs" | "projects" | "profile" | "general">(
    "general"
  );
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Contact Messages Filters, Pagination & Bulk Selection
  const [messageStatusFilter, setMessageStatusFilter] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [messagePage, setMessagePage] = useState(1);
  const [messagesMeta, setMessagesMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [messagesCounts, setMessagesCounts] = useState<
    { total: number; unread: number; read: number; archived: number } | undefined
  >(undefined);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  // Users Filters, Sorting, Pagination & Inspector State
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [userVerifiedFilter, setUserVerifiedFilter] = useState("");
  const [userSortBy, setUserSortBy] = useState<
    "createdAt" | "lastLoginAt" | "name" | "email" | "role" | "status"
  >("createdAt");
  const [userSortOrder, setUserSortOrder] = useState<"asc" | "desc">("desc");
  const [userPage, setUserPage] = useState(1);
  const [usersMeta, setUsersMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [usersSummary, setUsersSummary] = useState<UsersSummaryCounts | undefined>(undefined);
  const [inspectedUser, setInspectedUser] = useState<User | null>(null);
  const [inspectedSessions, setInspectedSessions] = useState<SessionInfo[]>([]);
  const [inspectedActivity, setInspectedActivity] = useState<AuditLogItem[]>([]);

  // Email Center & Campaign History State
  const [emailRecipientMode, setEmailRecipientMode] = useState<"SINGLE" | "SELECTED" | "ALL">(
    "SINGLE",
  );
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState(
    "<p>Write your official announcement or notification here...</p>",
  );
  const [emailTestAddress, setEmailTestAddress] = useState("");
  const [emailRespectConsent, setEmailRespectConsent] = useState(true);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [lastCampaignResult, setLastCampaignResult] = useState<EmailCampaignItem | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaignItem[]>([]);
  const [campaignsMeta, setCampaignsMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("");
  const [campaignPage, setCampaignPage] = useState(1);
  const [inspectedCampaign, setInspectedCampaign] = useState<EmailCampaignItem | null>(null);

  // Admin MFA Enrollment State
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpauthUri, setMfaOtpauthUri] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[] | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  // Audit Log Filters
  const [auditCategoryFilter, setAuditCategoryFilter] = useState("");
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState("");
  const [auditActionSearch, setAuditActionSearch] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  // Calculated Reading Time for Blog Editor
  const estimatedReadingTime = useMemo(() => {
    const plain = blogContent.replace(/<[^>]+>/g, " ").trim();
    const words = plain ? plain.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(words / 200));
  }, [blogContent]);

  // Data Fetchers
  const fetchOverviewAndTaxonomy = useCallback(async () => {
    const [ovRes, catRes, tagRes, setRes] = await Promise.all([
      apiFetch<AdminOverviewData>("/api/admin/overview"),
      apiFetch<{ categories: CategoryItem[] }>("/api/categories"),
      apiFetch<{ tags: TagItem[] }>("/api/tags"),
      apiFetch<{ settings: SiteSettingsData }>("/api/settings"),
    ]);
    setOverview(ovRes.data);
    setCategories(catRes.data.categories ?? []);
    setTags(tagRes.data.tags ?? []);
    setSettings(setRes.data.settings);
  }, []);

  const fetchBlogs = useCallback(
    async (pageOverride?: number) => {
      setBlogsLoading(true);
      try {
        const p = pageOverride ?? blogPage;
        const params = new URLSearchParams({
          page: String(p),
          limit: "12",
          sort: blogSort,
        });
        if (blogSearch.trim()) params.set("search", blogSearch.trim());
        if (blogStatusFilter) params.set("status", blogStatusFilter);
        if (blogCategoryFilter) params.set("category", blogCategoryFilter);
        const res = await apiFetch<{ blogs: BlogArticle[] }>(
          `/api/admin/blogs?${params.toString()}`,
        );
        const list = res.data.blogs ?? [];
        setBlogs(list);
        setSelectedBlogIds([]);
        if (res.meta) {
          setBlogsMeta({
            page: Number(res.meta.page ?? p),
            limit: Number(res.meta.limit ?? 12),
            total: Number(res.meta.total ?? list.length),
            totalPages: Number(res.meta.totalPages ?? 1),
          });
        }
      } finally {
        setBlogsLoading(false);
      }
    },
    [blogPage, blogSort, blogSearch, blogStatusFilter, blogCategoryFilter],
  );

  const fetchProjects = useCallback(
    async (pageOverride?: number) => {
      setProjectsLoading(true);
      try {
        const p = pageOverride ?? projectPage;
        const params = new URLSearchParams({
          page: String(p),
          limit: "12",
          sort: projectSort,
        });
        if (projectSearch.trim()) params.set("search", projectSearch.trim());
        if (projectStatusFilter) params.set("status", projectStatusFilter);
        if (projectCategoryFilter) params.set("category", projectCategoryFilter);
        const res = await apiFetch<{ projects: ProjectItem[] }>(
          `/api/admin/projects?${params.toString()}`,
        );
        const list = res.data.projects ?? [];
        setProjects(list);
        if (res.meta) {
          setProjectsMeta({
            page: Number(res.meta.page ?? p),
            limit: Number(res.meta.limit ?? 12),
            total: Number(res.meta.total ?? list.length),
            totalPages: Number(res.meta.totalPages ?? 1),
          });
        }
      } finally {
        setProjectsLoading(false);
      }
    },
    [projectPage, projectSort, projectSearch, projectStatusFilter, projectCategoryFilter],
  );

  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (mediaFolderFilter) params.set("folder", mediaFolderFilter);
      if (mediaSearch.trim()) params.set("search", mediaSearch.trim());
      const res = await apiFetch<{ media: MediaItem[] }>(`/api/admin/media?${params.toString()}`);
      setMedia(res.data.media ?? []);
    } finally {
      setMediaLoading(false);
    }
  }, [mediaFolderFilter, mediaSearch]);

  const fetchMessages = useCallback(
    async (pageOverride?: number) => {
      setMessagesLoading(true);
      try {
        const p = pageOverride ?? messagePage;
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        if (messageStatusFilter) params.set("status", messageStatusFilter);
        if (messageSearch.trim()) params.set("search", messageSearch.trim());
        const res = await apiFetch<{
          messages: ContactMessageItem[];
          counts?: { total: number; unread: number; read: number; archived: number };
        }>(`/api/admin/messages?${params.toString()}`);
        const list = res.data.messages ?? [];
        setMessages(list);
        setSelectedMessageIds([]);
        if (res.data.counts) {
          setMessagesCounts(res.data.counts);
        }
        if (res.meta) {
          setMessagesMeta({
            page: Number(res.meta.page ?? p),
            limit: Number(res.meta.limit ?? 20),
            total: Number(res.meta.total ?? list.length),
            totalPages: Number(res.meta.totalPages ?? 1),
          });
        }
      } finally {
        setMessagesLoading(false);
      }
    },
    [messagePage, messageStatusFilter, messageSearch],
  );

  const fetchUsers = useCallback(
    async (pageOverride?: number) => {
      setUsersLoading(true);
      try {
        const p = pageOverride ?? userPage;
        const params = new URLSearchParams({
          page: String(p),
          limit: "25",
          sortBy: userSortBy,
          sortOrder: userSortOrder,
        });
        if (userSearch.trim()) params.set("search", userSearch.trim());
        if (userRoleFilter) params.set("role", userRoleFilter);
        if (userStatusFilter) params.set("status", userStatusFilter);
        if (userVerifiedFilter) params.set("emailVerified", userVerifiedFilter);
        const res = await apiFetch<{ users: User[]; summary?: UsersSummaryCounts }>(
          `/api/admin/users?${params.toString()}`,
        );
        const list = res.data.users ?? [];
        setUsers(list);
        if (res.data.summary) {
          setUsersSummary(res.data.summary);
        }
        if (res.meta) {
          setUsersMeta({
            page: Number(res.meta.page ?? p),
            limit: Number(res.meta.limit ?? 25),
            total: Number(res.meta.total ?? list.length),
            totalPages: Number(res.meta.totalPages ?? 1),
          });
        }
      } finally {
        setUsersLoading(false);
      }
    },
    [
      userPage,
      userSearch,
      userRoleFilter,
      userStatusFilter,
      userVerifiedFilter,
      userSortBy,
      userSortOrder,
    ],
  );

  const fetchEmailCampaigns = useCallback(
    async (pageOverride?: number) => {
      setCampaignsLoading(true);
      try {
        const p = pageOverride ?? campaignPage;
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        if (campaignStatusFilter) params.set("status", campaignStatusFilter);
        if (campaignSearch.trim()) params.set("search", campaignSearch.trim());
        const res = await apiFetch<{ campaigns: EmailCampaignItem[] }>(
          `/api/admin/emails/history?${params.toString()}`,
        );
        const list = res.data.campaigns ?? [];
        setCampaigns(list);
        if (res.meta) {
          setCampaignsMeta({
            page: Number(res.meta.page ?? p),
            limit: Number(res.meta.limit ?? 20),
            total: Number(res.meta.total ?? list.length),
            totalPages: Number(res.meta.totalPages ?? 1),
          });
        }
      } finally {
        setCampaignsLoading(false);
      }
    },
    [campaignPage, campaignStatusFilter, campaignSearch],
  );

  const fetchAuditLogs = useCallback(
    async (pageOverride?: number) => {
      setAuditLoading(true);
      try {
        const p = pageOverride ?? auditPage;
        const params = new URLSearchParams({ page: String(p), limit: "25" });
        if (auditCategoryFilter) params.set("category", auditCategoryFilter);
        if (auditOutcomeFilter) params.set("outcome", auditOutcomeFilter);
        if (auditActionSearch.trim()) params.set("search", auditActionSearch.trim());
        const res = await apiFetch<{ logs: AuditLogItem[] }>(
          `/api/admin/audit-logs?${params.toString()}`,
        );
        const list = res.data.logs ?? [];
        setAuditLogs(list);
        if (res.meta) {
          setAuditMeta({
            page: Number(res.meta.page ?? p),
            limit: Number(res.meta.limit ?? 25),
            total: Number(res.meta.total ?? list.length),
            totalPages: Number(res.meta.totalPages ?? 1),
          });
        }
      } finally {
        setAuditLoading(false);
      }
    },
    [auditPage, auditCategoryFilter, auditOutcomeFilter, auditActionSearch],
  );

  const loadAllDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchOverviewAndTaxonomy(),
        fetchBlogs(1),
        fetchProjects(1),
        fetchMedia(),
        fetchMessages(1),
        fetchUsers(1),
        fetchEmailCampaigns(1),
        fetchAuditLogs(1),
      ]);
    } catch (err) {
      pushToast(
        "error",
        "Failed to synchronize dashboard",
        err instanceof Error ? err.message : "Unexpected network error",
      );
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [
    fetchOverviewAndTaxonomy,
    fetchBlogs,
    fetchProjects,
    fetchMedia,
    fetchMessages,
    fetchUsers,
    fetchEmailCampaigns,
    fetchAuditLogs,
    pushToast,
  ]);

  useEffect(() => {
    void loadAllDashboardData();
  }, []);

  // Re-fetch when filter states change
  useEffect(() => {
    if (!initialLoading) void fetchBlogs(1);
  }, [blogStatusFilter, blogCategoryFilter, blogSort]);

  useEffect(() => {
    if (!initialLoading) void fetchProjects(1);
  }, [projectStatusFilter, projectCategoryFilter, projectSort]);

  useEffect(() => {
    if (!initialLoading) void fetchMessages(1);
  }, [messageStatusFilter]);

  useEffect(() => {
    if (!initialLoading) void fetchUsers(1);
  }, [userRoleFilter, userStatusFilter, userVerifiedFilter, userSortBy, userSortOrder]);

  useEffect(() => {
    if (!initialLoading) void fetchEmailCampaigns(1);
  }, [campaignStatusFilter]);

  useEffect(() => {
    if (!initialLoading) void fetchMedia();
  }, [mediaFolderFilter]);

  // Blog Editor Helpers
  const openNewBlogEditor = () => {
    setEditingBlogId(null);
    setBlogTitle("");
    setBlogSlug("");
    setBlogExcerpt("");
    setBlogContent("<p>Start writing your technical article...</p>");
    setBlogCoverImage(undefined);
    setBlogCategoryId("");
    setBlogSelectedTagIds([]);
    setBlogStatus("DRAFT");
    setBlogScheduledAt("");
    setBlogFeatured(false);
    setBlogSeoTitle("");
    setBlogSeoDescription("");
    setBlogEditorMode("write");
    setBlogEditorOpen(true);
    setActiveSection("blogs");
  };

  const openEditBlog = (blog: BlogArticle) => {
    setEditingBlogId(blog.id);
    setBlogTitle(blog.title);
    setBlogSlug(blog.slug);
    setBlogExcerpt(blog.excerpt);
    setBlogContent(blog.content);
    setBlogCoverImage(blog.coverImage);
    setBlogCategoryId(blog.category?.id || "");
    setBlogSelectedTagIds((blog.tags || []).map((t) => t.id));
    setBlogStatus(blog.status);
    setBlogScheduledAt(
      blog.publishedAt ? new Date(blog.publishedAt).toISOString().slice(0, 16) : ""
    );
    setBlogFeatured(blog.featured);
    setBlogSeoTitle(blog.seoTitle || "");
    setBlogSeoDescription(blog.seoDescription || "");
    setBlogEditorMode("write");
    setBlogEditorOpen(true);
    setActiveSection("blogs");
  };

  const saveBlogArticle = async (statusOverride?: "DRAFT" | "PUBLISHED" | "SCHEDULED") => {
    const targetStatus = statusOverride ?? blogStatus;
    if (!blogTitle.trim()) {
      pushToast("error", "Title required", "Please provide a blog post title.");
      return;
    }
    setSaving(true);
    try {
      const plain = blogContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const effectiveExcerpt =
        blogExcerpt.trim().length >= 3
          ? blogExcerpt.trim()
          : plain.slice(0, 180) || blogTitle.trim();

      const payload: Record<string, unknown> = {
        title: blogTitle.trim(),
        slug: blogSlug.trim() || slugifyText(blogTitle),
        excerpt: effectiveExcerpt,
        content: blogContent,
        coverImage: blogCoverImage || null,
        category: blogCategoryId || null,
        tags: blogSelectedTagIds,
        status: targetStatus,
        featured: blogFeatured,
        seoTitle: blogSeoTitle.trim() || undefined,
        seoDescription: blogSeoDescription.trim() || undefined,
      };
      if (targetStatus === "SCHEDULED" && blogScheduledAt) {
        payload.publishedAt = new Date(blogScheduledAt).toISOString();
      }

      if (editingBlogId) {
        await apiFetch(`/api/admin/blogs/${editingBlogId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Article updated", `"${blogTitle}" has been saved.`);
      } else {
        await apiFetch("/api/admin/blogs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Article created", `"${blogTitle}" has been created.`);
      }
      setBlogEditorOpen(false);
      await Promise.all([fetchBlogs(blogPage), fetchOverviewAndTaxonomy()]);
    } catch (err) {
      pushToast(
        "error",
        "Failed to save article",
        err instanceof Error ? err.message : "Validation error"
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteBlog = (blog: BlogArticle) => {
    askConfirm({
      title: "Delete Blog Post",
      description: `Are you sure you want to permanently delete "${blog.title}"? This action cannot be undone.`,
      confirmLabel: "Delete Article",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch(`/api/admin/blogs/${blog.id}`, { method: "DELETE" });
          pushToast("success", "Article deleted", `"${blog.title}" was removed.`);
          if (editingBlogId === blog.id) setBlogEditorOpen(false);
          setConfirmState(null);
          await Promise.all([fetchBlogs(blogPage), fetchOverviewAndTaxonomy()]);
        } catch (err) {
          pushToast(
            "error",
            "Delete failed",
            err instanceof Error ? err.message : "Could not delete article"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleBulkBlogAction = (action: "PUBLISH" | "DRAFT" | "DELETE") => {
    if (selectedBlogIds.length === 0) return;
    askConfirm({
      title: `${action} ${selectedBlogIds.length} Selected Article(s)`,
      description:
        action === "DELETE"
          ? `Permanently delete ${selectedBlogIds.length} selected blog post(s)? This cannot be undone.`
          : `Change status of ${selectedBlogIds.length} selected blog post(s) to ${
              action === "PUBLISH" ? "PUBLISHED" : "DRAFT"
            }?`,
      confirmLabel: action === "DELETE" ? "Delete Selected" : "Apply Bulk Action",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch("/api/admin/blogs/bulk", {
            method: "POST",
            body: JSON.stringify({ ids: selectedBlogIds, action }),
          });
          pushToast(
            "success",
            "Bulk action completed",
            `Processed ${selectedBlogIds.length} article(s).`
          );
          setConfirmState(null);
          await Promise.all([fetchBlogs(blogPage), fetchOverviewAndTaxonomy()]);
        } catch (err) {
          pushToast(
            "error",
            "Bulk action failed",
            err instanceof Error ? err.message : "Failed to run bulk operation"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  // Project Editor Helpers
  const openNewProjectEditor = () => {
    setEditingProjectId(null);
    setProjectTitle("");
    setProjectSlug("");
    setProjectSummary("");
    setProjectDescription("<p>Detail the system architecture, tech stack, and impact...</p>");
    setProjectCoverImage(undefined);
    setProjectScreenshots([]);
    setProjectTechInput("TypeScript, Next.js, Bun, MongoDB");
    setProjectGithubUrl("");
    setProjectLiveUrl("");
    setProjectCategoryId("");
    setProjectStatus("PUBLISHED");
    setProjectFeatured(false);
    setProjectOrder(0);
    setProjectSeoTitle("");
    setProjectSeoDescription("");
    setProjectEditorOpen(true);
    setActiveSection("projects");
  };

  const openEditProject = (proj: ProjectItem) => {
    setEditingProjectId(proj.id);
    setProjectTitle(proj.title);
    setProjectSlug(proj.slug);
    setProjectSummary(proj.summary);
    setProjectDescription(proj.description);
    setProjectCoverImage(proj.coverImage);
    setProjectScreenshots(proj.images || []);
    setProjectTechInput((proj.technologies || []).join(", "));
    setProjectGithubUrl(proj.githubUrl || "");
    setProjectLiveUrl(proj.liveUrl || "");
    setProjectCategoryId(proj.category?.id || "");
    setProjectStatus(proj.status);
    setProjectFeatured(proj.featured);
    setProjectOrder(proj.order || 0);
    setProjectSeoTitle(proj.seoTitle || "");
    setProjectSeoDescription(proj.seoDescription || "");
    setProjectEditorOpen(true);
    setActiveSection("projects");
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const technologies = projectTechInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: projectTitle.trim(),
        slug: projectSlug.trim() || slugifyText(projectTitle),
        summary: projectSummary.trim() || projectTitle.trim(),
        description: projectDescription,
        coverImage: projectCoverImage || null,
        images: projectScreenshots,
        technologies: technologies.length > 0 ? technologies : ["TypeScript"],
        githubUrl: projectGithubUrl.trim() || "",
        liveUrl: projectLiveUrl.trim() || "",
        category: projectCategoryId || null,
        featured: projectFeatured,
        status: projectStatus,
        order: Number(projectOrder) || 0,
        seoTitle: projectSeoTitle.trim() || undefined,
        seoDescription: projectSeoDescription.trim() || undefined,
      };

      if (editingProjectId) {
        await apiFetch(`/api/admin/projects/${editingProjectId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Project updated", `"${projectTitle}" has been updated.`);
      } else {
        await apiFetch("/api/admin/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Project created", `"${projectTitle}" added to portfolio.`);
      }
      setProjectEditorOpen(false);
      await Promise.all([fetchProjects(projectPage), fetchOverviewAndTaxonomy()]);
    } catch (err) {
      pushToast(
        "error",
        "Failed to save project",
        err instanceof Error ? err.message : "Validation error"
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteProject = (proj: ProjectItem) => {
    askConfirm({
      title: "Delete Portfolio Project",
      description: `Are you sure you want to permanently delete "${proj.title}"?`,
      confirmLabel: "Delete Project",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch(`/api/admin/projects/${proj.id}`, { method: "DELETE" });
          pushToast("success", "Project deleted", `"${proj.title}" was deleted.`);
          if (editingProjectId === proj.id) setProjectEditorOpen(false);
          setConfirmState(null);
          await Promise.all([fetchProjects(projectPage), fetchOverviewAndTaxonomy()]);
        } catch (err) {
          pushToast(
            "error",
            "Delete failed",
            err instanceof Error ? err.message : "Could not delete project"
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  // Taxonomy Handlers
  const handleSaveCategory = async (
    payload: { name: string; slug: string; type: "BLOG" | "PROJECT"; description?: string },
    editingId?: string
  ) => {
    try {
      if (editingId) {
        await apiFetch(`/api/categories/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Category updated", `"${payload.name}" updated.`);
      } else {
        await apiFetch("/api/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Category created", `"${payload.name}" created.`);
      }
      await fetchOverviewAndTaxonomy();
    } catch (err) {
      pushToast(
        "error",
        "Category save failed",
        err instanceof Error ? err.message : "Could not save category"
      );
    }
  };

  const confirmDeleteCategory = (cat: CategoryItem) => {
    askConfirm({
      title: "Delete Category",
      description: `Delete category "${cat.name}" (/${cat.slug})?`,
      confirmLabel: "Delete Category",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch(`/api/categories/${cat.id}`, { method: "DELETE" });
          pushToast("success", "Category deleted", `"${cat.name}" removed.`);
          setConfirmState(null);
          await fetchOverviewAndTaxonomy();
        } catch (err) {
          pushToast("error", "Delete failed", err instanceof Error ? err.message : "Error");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleSaveTag = async (payload: { name: string; slug: string }, editingId?: string) => {
    try {
      if (editingId) {
        await apiFetch(`/api/tags/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Tag updated", `#${payload.name} updated.`);
      } else {
        await apiFetch("/api/tags", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("success", "Tag created", `#${payload.name} created.`);
      }
      await fetchOverviewAndTaxonomy();
    } catch (err) {
      pushToast(
        "error",
        "Tag save failed",
        err instanceof Error ? err.message : "Could not save tag"
      );
    }
  };

  const confirmDeleteTag = (tag: TagItem) => {
    askConfirm({
      title: "Delete Tag",
      description: `Delete tag "#${tag.name}"?`,
      confirmLabel: "Delete Tag",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch(`/api/tags/${tag.id}`, { method: "DELETE" });
          pushToast("success", "Tag deleted", `#${tag.name} removed.`);
          setConfirmState(null);
          await fetchOverviewAndTaxonomy();
        } catch (err) {
          pushToast("error", "Delete failed", err instanceof Error ? err.message : "Error");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  // Media Handlers
  const handleUploadMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      await apiUploadMediaFile(file, {
        folder: uploadFolder,
        alt: uploadAlt.trim() || file.name,
      });
      setUploadAlt("");
      pushToast("success", "Media asset uploaded", `${file.name} verified and stored.`);
      await Promise.all([fetchMedia(), fetchOverviewAndTaxonomy()]);
    } catch (err) {
      pushToast(
        "error",
        "Upload failed",
        err instanceof Error ? err.message : "File validation failed"
      );
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const confirmDeleteMedia = (item: MediaItem) => {
    askConfirm({
      title: "Delete Media Asset",
      description: `Permanently delete "${item.alt || item.publicId}" from Media Library and Cloudinary?`,
      confirmLabel: "Delete Asset",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
          pushToast("success", "Asset deleted", `${item.publicId} removed.`);
          setConfirmState(null);
          await Promise.all([fetchMedia(), fetchOverviewAndTaxonomy()]);
        } catch (err) {
          pushToast("error", "Delete failed", err instanceof Error ? err.message : "Error");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  // Messages Handlers
  const handleUpdateMessageStatus = async (
    id: string,
    status: "NEW" | "READ" | "ARCHIVED",
  ) => {
    try {
      await apiFetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      pushToast(
        "success",
        "Message updated",
        status === "NEW" ? "Marked as Unread." : `Marked as ${status}.`,
      );
      await Promise.all([fetchMessages(messagePage), fetchOverviewAndTaxonomy()]);
    } catch (err) {
      pushToast("error", "Update failed", err instanceof Error ? err.message : "Error");
    }
  };

  const confirmDeleteMessage = (msg: ContactMessageItem) => {
    askConfirm({
      title: "Delete Contact Message",
      description: `Permanently delete inquiry "${msg.subject}" from ${msg.name} (${msg.email})?`,
      confirmLabel: "Delete Message",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch(`/api/admin/messages/${msg.id}`, { method: "DELETE" });
          pushToast("success", "Message deleted", "Inquiry removed from inbox.");
          setConfirmState(null);
          await Promise.all([fetchMessages(messagePage), fetchOverviewAndTaxonomy()]);
        } catch (err) {
          pushToast("error", "Delete failed", err instanceof Error ? err.message : "Error");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleBulkMessagesAction = (
    action: "MARK_READ" | "MARK_UNREAD" | "MARK_ALL_READ" | "DELETE_SELECTED" | "DELETE_ALL",
  ) => {
    if (action === "DELETE_ALL") {
      askConfirm({
        title: "Delete ALL Contact Messages (Irreversible)",
        description:
          "WARNING: You are about to permanently delete EVERY contact message in the inbox. This action is irreversible and will be recorded in the Security Audit Log.",
        confirmLabel: "Permanently Delete All Messages",
        onConfirm: async () => {
          setConfirmBusy(true);
          try {
            const res = await apiFetch<{ affectedCount: number }>("/api/admin/messages/bulk", {
              method: "POST",
              body: JSON.stringify({ action: "DELETE_ALL", confirm: true }),
            });
            pushToast(
              "success",
              "All messages deleted",
              `Deleted ${res.data.affectedCount} message(s).`,
            );
            setConfirmState(null);
            await Promise.all([fetchMessages(1), fetchOverviewAndTaxonomy()]);
          } catch (err) {
            pushToast("error", "Bulk delete failed", err instanceof Error ? err.message : "Error");
          } finally {
            setConfirmBusy(false);
          }
        },
      });
      return;
    }

    if (action === "DELETE_SELECTED") {
      if (selectedMessageIds.length === 0) return;
      askConfirm({
        title: `Delete ${selectedMessageIds.length} Selected Message(s)`,
        description: `Permanently delete ${selectedMessageIds.length} selected contact message(s)? This action cannot be undone.`,
        confirmLabel: "Delete Selected",
        onConfirm: async () => {
          setConfirmBusy(true);
          try {
            const res = await apiFetch<{ affectedCount: number }>("/api/admin/messages/bulk", {
              method: "POST",
              body: JSON.stringify({ action: "DELETE_SELECTED", ids: selectedMessageIds }),
            });
            pushToast(
              "success",
              "Selected messages deleted",
              `Removed ${res.data.affectedCount} message(s).`,
            );
            setConfirmState(null);
            await Promise.all([fetchMessages(messagePage), fetchOverviewAndTaxonomy()]);
          } catch (err) {
            pushToast("error", "Bulk delete failed", err instanceof Error ? err.message : "Error");
          } finally {
            setConfirmBusy(false);
          }
        },
      });
      return;
    }

    void (async () => {
      try {
        const res = await apiFetch<{ affectedCount: number }>("/api/admin/messages/bulk", {
          method: "POST",
          body: JSON.stringify({
            action,
            ...(action === "MARK_ALL_READ" ? {} : { ids: selectedMessageIds }),
          }),
        });
        pushToast(
          "success",
          "Bulk update completed",
          `Updated ${res.data.affectedCount} message(s).`,
        );
        await Promise.all([fetchMessages(messagePage), fetchOverviewAndTaxonomy()]);
      } catch (err) {
        pushToast("error", "Bulk update failed", err instanceof Error ? err.message : "Error");
      }
    })();
  };

  // User Management & Role Governance Handlers
  const handleToggleUserSort = (
    field: "createdAt" | "lastLoginAt" | "name" | "email" | "role" | "status",
  ) => {
    if (userSortBy === field) {
      setUserSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setUserSortBy(field);
      setUserSortOrder("desc");
    }
  };

  const handleUpdateUser = (
    u: User,
    patch: { status?: "ACTIVE" | "SUSPENDED" | "PENDING"; emailVerified?: boolean },
  ) => {
    if (patch.status === "SUSPENDED") {
      askConfirm({
        title: `Suspend Account: ${u.name}`,
        description: `Suspending ${u.email} will immediately block access and revoke all active sessions.`,
        confirmLabel: "Suspend User",
        onConfirm: async () => {
          setConfirmBusy(true);
          try {
            await apiFetch(`/api/admin/users/${u.id}/status`, {
              method: "PATCH",
              body: JSON.stringify(patch),
            });
            pushToast("success", "User suspended", `${u.email} has been suspended.`);
            setConfirmState(null);
            await Promise.all([fetchUsers(userPage), fetchOverviewAndTaxonomy()]);
          } catch (err) {
            pushToast("error", "Update failed", err instanceof Error ? err.message : "Error");
          } finally {
            setConfirmBusy(false);
          }
        },
      });
      return;
    }

    void (async () => {
      try {
        await apiFetch(`/api/admin/users/${u.id}/status`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        pushToast("success", "User account updated", `${u.email} updated.`);
        await Promise.all([fetchUsers(userPage), fetchOverviewAndTaxonomy()]);
      } catch (err) {
        pushToast("error", "Update failed", err instanceof Error ? err.message : "Error");
      }
    })();
  };

  const handleChangeUserRole = (u: User, newRole: Role) => {
    if (u.role === newRole) return;
    askConfirm({
      title: `Confirm Role Change: ${u.name}`,
      description: `Change role of ${u.name} (${u.email}) from ${u.role} to ${newRole}? This action updates privileges immediately and records an immutable Audit Log entry.`,
      confirmLabel: `Assign ${newRole}`,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          const res = await apiFetch<{ user: User }>(`/api/admin/users/${u.id}/role`, {
            method: "PATCH",
            body: JSON.stringify({ role: newRole }),
          });
          pushToast(
            "success",
            "User role updated",
            `${u.email} is now assigned the ${newRole} role.`,
          );
          if (inspectedUser && inspectedUser.id === u.id) {
            setInspectedUser(res.data.user);
          }
          setConfirmState(null);
          await Promise.all([fetchUsers(userPage), fetchOverviewAndTaxonomy(), fetchAuditLogs(1)]);
        } catch (err) {
          pushToast(
            "error",
            "Role change rejected",
            err instanceof Error ? err.message : "Insufficient permissions",
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleEmailSingleUser = (u: User) => {
    setEmailRecipientMode("SINGLE");
    setSelectedRecipientIds([u.id]);
    setEmailSubject(`Message from Dezaakir Administration`);
    setActiveSection("emailCenter");
  };

  const handleInspectUser = async (u: User) => {
    setInspectedUser(u);
    try {
      const detailsRes = await apiFetch<{
        user: User;
        sessions: SessionInfo[];
        recentActivity: AuditLogItem[];
      }>(`/api/admin/users/${u.id}`);
      setInspectedUser(detailsRes.data.user);
      setInspectedSessions(detailsRes.data.sessions ?? []);
      setInspectedActivity(detailsRes.data.recentActivity ?? []);
    } catch {
      setInspectedSessions([]);
      setInspectedActivity([]);
    }
  };

  const handleRevokeUserSessions = (u: User) => {
    askConfirm({
      title: "Revoke All User Sessions",
      description: `Force sign-out all active devices for ${u.email}?`,
      confirmLabel: "Revoke Sessions",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await apiFetch(`/api/admin/users/${u.id}/sessions`, { method: "DELETE" });
          pushToast("success", "Sessions revoked", `All sessions terminated for ${u.email}.`);
          setInspectedSessions([]);
          setConfirmState(null);
        } catch (err) {
          pushToast("error", "Revoke failed", err instanceof Error ? err.message : "Error");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  // Email Center Handlers
  const handlePreviewAdminEmail = async () => {
    if (!emailSubject.trim()) {
      pushToast("error", "Subject required", "Enter a subject line before previewing.");
      return;
    }
    setEmailPreviewLoading(true);
    try {
      const res = await apiFetch<{ html: string }>("/api/admin/emails/preview", {
        method: "POST",
        body: JSON.stringify({
          subject: emailSubject.trim(),
          bodyHtml: emailBodyHtml,
        }),
      });
      setEmailPreviewHtml(res.data.html);
    } catch (err) {
      pushToast(
        "error",
        "Preview failed",
        err instanceof Error ? err.message : "Could not render email preview",
      );
    } finally {
      setEmailPreviewLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailSubject.trim()) {
      pushToast("error", "Subject required", "Please enter an email subject first.");
      return;
    }
    setEmailSending(true);
    try {
      const res = await apiFetch<{ campaign: EmailCampaignItem }>("/api/admin/emails/send", {
        method: "POST",
        body: JSON.stringify({
          recipientMode: "TEST",
          testEmail: (emailTestAddress || currentAdmin?.email || "").trim(),
          subject: emailSubject.trim(),
          bodyHtml: emailBodyHtml,
        }),
      });
      setLastCampaignResult(res.data.campaign);
      pushToast(
        "success",
        "Test email sent",
        `Delivered test email to ${emailTestAddress || currentAdmin?.email}.`,
      );
      await fetchEmailCampaigns(1);
    } catch (err) {
      pushToast("error", "Test email failed", err instanceof Error ? err.message : "Error");
    } finally {
      setEmailSending(false);
    }
  };

  const handleDispatchCampaign = () => {
    if (!emailSubject.trim()) {
      pushToast("error", "Subject required", "Please provide an email subject line.");
      return;
    }
    if (emailRecipientMode !== "ALL" && selectedRecipientIds.length === 0) {
      pushToast("error", "Recipients required", "Please select at least one recipient user.");
      return;
    }

    const targetDesc =
      emailRecipientMode === "ALL"
        ? "ALL active verified users"
        : `${selectedRecipientIds.length} selected user(s)`;

    askConfirm({
      title: "Confirm Email Campaign Dispatch",
      description: `Send "${emailSubject.trim()}" to ${targetDesc}? Each recipient will receive an individually addressed email.`,
      confirmLabel: "Send Email Campaign",
      onConfirm: async () => {
        setConfirmBusy(true);
        setEmailSending(true);
        try {
          const res = await apiFetch<{ campaign: EmailCampaignItem }>("/api/admin/emails/send", {
            method: "POST",
            body: JSON.stringify({
              recipientMode: emailRecipientMode,
              ...(emailRecipientMode !== "ALL" ? { recipientIds: selectedRecipientIds } : {}),
              subject: emailSubject.trim(),
              bodyHtml: emailBodyHtml,
              respectMarketingConsent: emailRespectConsent,
            }),
          });
          setLastCampaignResult(res.data.campaign);
          pushToast(
            "success",
            "Campaign dispatched",
            `Sent to ${res.data.campaign.sentCount} of ${res.data.campaign.recipientCount} recipient(s).`,
          );
          setConfirmState(null);
          await Promise.all([
            fetchEmailCampaigns(1),
            fetchOverviewAndTaxonomy(),
            fetchAuditLogs(1),
          ]);
        } catch (err) {
          pushToast(
            "error",
            "Campaign dispatch failed",
            err instanceof Error ? err.message : "Could not send campaign",
          );
        } finally {
          setConfirmBusy(false);
          setEmailSending(false);
        }
      },
    });
  };

  const handleInspectCampaign = async (id: string) => {
    try {
      const res = await apiFetch<{ campaign: EmailCampaignItem }>(
        `/api/admin/emails/history/${id}`,
      );
      setInspectedCampaign(res.data.campaign);
    } catch (err) {
      pushToast("error", "Load failed", err instanceof Error ? err.message : "Error");
    }
  };

  // Security MFA Handlers
  const handleSetupMfa = async () => {
    setMfaBusy(true);
    try {
      const res = await apiFetch<{ secret: string; otpauthUri: string }>("/api/auth/mfa/setup", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMfaSecret(res.data.secret);
      setMfaOtpauthUri(res.data.otpauthUri);
      pushToast("info", "MFA secret generated", "Add the secret key to your authenticator app.");
    } catch (err) {
      pushToast("error", "MFA setup error", err instanceof Error ? err.message : "Error");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleEnableMfa = async (code: string) => {
    setMfaBusy(true);
    try {
      const res = await apiFetch<{ recoveryCodes: string[] }>("/api/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setMfaRecoveryCodes(res.data.recoveryCodes);
      setMfaSecret(null);
      pushToast("success", "MFA enabled", "TOTP multi-factor authentication is now active.");
      await fetchAuditLogs(1);
    } catch (err) {
      pushToast("error", "Invalid TOTP code", err instanceof Error ? err.message : "Error");
    } finally {
      setMfaBusy(false);
    }
  };

  // Site & SEO Settings Save Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ settings: SiteSettingsData }>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(res.data.settings);
      pushToast("success", "Settings saved", "Site & SEO configuration updated.");
    } catch (err) {
      pushToast(
        "error",
        "Settings save failed",
        err instanceof Error ? err.message : "Validation error",
      );
    } finally {
      setSaving(false);
    }
  };

  // Media Picker Selection Callback
  const handleMediaPickerSelect = (img: ImageRef) => {
    if (mediaPickerTarget === "blogCover") {
      setBlogCoverImage(img);
    } else if (mediaPickerTarget === "projectThumb") {
      setProjectCoverImage(img);
    } else if (mediaPickerTarget === "projectScreenshot") {
      setProjectScreenshots((prev) => [...prev, img]);
    } else if (mediaPickerTarget === "profile" && settings) {
      setSettings({ ...settings, profileImage: img });
    } else if (mediaPickerTarget === "og" && settings) {
      setSettings({ ...settings, seo: { ...settings.seo, ogImage: img } });
    }
    setMediaPickerTarget(null);
  };

  const unreadMessagesCount =
    messagesCounts?.unread ?? overview?.stats.messages.unread ?? 0;

  const navGroups: Array<{
    label: string;
    items: Array<{
      id: AdminNavSection;
      label: string;
      icon: typeof LayoutDashboard;
      badge?: number;
      highlightBadge?: boolean;
    }>;
  }> = [
    {
      label: "Overview",
      items: [{ id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Content Management",
      items: [
        {
          id: "blogs" as const,
          label: "Blog Management",
          icon: FileText,
          badge: overview?.stats.blogs.total,
        },
        {
          id: "projects" as const,
          label: "Projects",
          icon: FolderKanban,
          badge: overview?.stats.projects.total,
        },
        {
          id: "taxonomy" as const,
          label: "Categories and Tags",
          icon: Tag,
          badge: categories.length + tags.length,
        },
        {
          id: "media" as const,
          label: "Media Library",
          icon: ImageIcon,
          badge: overview?.stats.media.total,
        },
      ],
    },
    {
      label: "User Management",
      items: [
        {
          id: "users" as const,
          label: "Users",
          icon: Users,
          badge: usersSummary?.total ?? overview?.stats.users.total,
        },
        {
          id: "roles" as const,
          label: "Roles and Permissions",
          icon: UserCheck,
          badge: overview?.stats.users.admins,
        },
      ],
    },
    {
      label: "Communication",
      items: [
        {
          id: "messages" as const,
          label: "Contact Messages",
          icon: MessageSquare,
          badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
          highlightBadge: unreadMessagesCount > 0,
        },
        {
          id: "emailCenter" as const,
          label: "Email Center",
          icon: Send,
        },
        {
          id: "emailHistory" as const,
          label: "Email History",
          icon: History,
          badge: campaignsMeta.total > 0 ? campaignsMeta.total : undefined,
        },
      ],
    },
    {
      label: "System",
      items: [
        { id: "settings" as const, label: "Site Settings", icon: Settings },
        { id: "seo" as const, label: "SEO Settings", icon: Globe },
        { id: "security" as const, label: "Security", icon: Shield },
        { id: "audit" as const, label: "Audit Logs", icon: ShieldCheck },
      ],
    },
  ];

  const sectionTitles: Record<AdminNavSection, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Executive Platform Overview",
      subtitle: "Real-time user, content, communication, and security telemetry",
    },
    blogs: {
      title: "Blog Management & Technical Publishing",
      subtitle: "Author, schedule, preview, and manage technical articles and SEO metadata",
    },
    projects: {
      title: "Engineering Portfolio Management",
      subtitle: "Manage case studies, architecture descriptions, screenshots, and live deployments",
    },
    taxonomy: {
      title: "Categories and Tags",
      subtitle: "Organize blog posts and portfolio projects into structured taxonomies and topic tags",
    },
    categories: {
      title: "Content Categories",
      subtitle: "Organize blog posts and portfolio projects into structured taxonomies",
    },
    tags: {
      title: "Topic Tags",
      subtitle: "Manage cross-cutting technical tags and inspect article usage counts",
    },
    media: {
      title: "Centralized Media Library",
      subtitle: "Server-validated image uploads and Cloudinary CDN asset management",
    },
    users: {
      title: "Advanced User Management",
      subtitle: "Search, filter, sort, verify, and manage user accounts and roles",
    },
    roles: {
      title: "Roles and Permissions Governance",
      subtitle: "Least-privilege RBAC administration with confirmation and audit logging",
    },
    messages: {
      title: "Contact Messages & Inbox Management",
      subtitle: "Read, filter, bulk-update, and manage incoming contact inquiries",
    },
    emailCenter: {
      title: "Admin Email Notification Center",
      subtitle: "Compose, preview, and dispatch branded Dezaakir emails to individual or all users",
    },
    emailHistory: {
      title: "Email Campaign History & Delivery Telemetry",
      subtitle: "Inspect sent email campaigns, recipient counts, and delivery outcomes",
    },
    analytics: {
      title: "Platform Analytics & Publishing Trends",
      subtitle: "6-month MongoDB time-series aggregations across content, users, and inquiries",
    },
    settings: {
      title: "Site Settings & Author Profile",
      subtitle: "Configure platform identity, biography, skills, social links, and system status",
    },
    seo: {
      title: "SEO & OpenGraph Configuration",
      subtitle: "Manage global search metadata, social cards, sitemaps, and per-page SEO readiness",
    },
    security: {
      title: "Platform Security & Administrator MFA",
      subtitle: "Configure TOTP multi-factor authentication and review active security defenses",
    },
    audit: {
      title: "Security & Administrative Audit Logs",
      subtitle: "Immutable record of authentication, role changes, content mutations, and access events",
    },
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col justify-between bg-navy text-white">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/15 px-4">
          <Link
            href="/"
            className="flex items-center gap-3 overflow-hidden"
            title="Dezaakir — View Public Website"
          >
            <BrandLogo className="h-8" />
            {(!sidebarCollapsed || isMobile) && (
              <div className="leading-tight">
                <span className="block text-sm font-bold tracking-tight text-white">
                  Dezaakir
                </span>
                <span className="block font-mono text-[9px] uppercase tracking-widest text-white/55">
                  Admin Console
                </span>
              </div>
            )}
          </Link>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="border border-white/20 p-1.5 text-white/75 hover:border-white hover:text-white"
              aria-label="Close navigation drawer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="border border-white/15 p-1.5 text-white/70 transition hover:border-white hover:text-white"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="max-h-[calc(100vh-11rem)] space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin sidebar navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              {(!sidebarCollapsed || isMobile) && (
                <p className="mb-1.5 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white/45">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={sidebarCollapsed && !isMobile ? item.label : undefined}
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`group flex w-full items-center justify-between px-2.5 py-2 text-xs font-medium transition ${
                        active
                          ? "bg-white font-semibold text-navy"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
                      </div>
                      {(!sidebarCollapsed || isMobile) && item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 font-mono text-[10px] ${
                            active
                              ? "bg-navy text-white"
                              : "highlightBadge" in item && item.highlightBadge
                                ? "bg-white font-bold text-navy"
                                : "bg-white/10 text-white/75"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Logged-in Administrator Footer */}
      <div className="border-t border-white/15 p-3">
        {(!sidebarCollapsed || isMobile) && currentAdmin && (
          <div className="mb-2.5 border border-white/15 bg-white/[0.02] px-3 py-2">
            <p className="truncate text-xs font-bold text-white">{currentAdmin.name}</p>
            <p className="truncate font-mono text-[10px] text-white/60">{currentAdmin.email}</p>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            title="View Live Website"
            className="flex flex-1 items-center justify-center gap-1.5 border border-white/20 py-2 text-xs font-semibold text-white/80 transition hover:border-white hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {(!sidebarCollapsed || isMobile) && <span>Live Site</span>}
          </Link>
          <button
            type="button"
            title="Sign Out"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="flex flex-1 items-center justify-center gap-1.5 bg-white py-2 text-xs font-bold text-navy transition hover:bg-white/90"
          >
            <LogOut className="h-3.5 w-3.5" />
            {(!sidebarCollapsed || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-navy text-white">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-white/15 transition-all duration-200 lg:block ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-navy/80 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 border-r border-white/20 bg-navy">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/15 bg-navy/95 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="border border-white/20 p-2 text-white lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/55">
                <span>Dezaakir Admin</span>
                <span>/</span>
                <span className="text-white">{activeSection}</span>
              </div>
              <h1 className="text-sm font-bold text-white sm:text-base">
                {sectionTitles[activeSection].title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={openNewBlogEditor}
              className="hidden items-center gap-1.5 bg-white px-3.5 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90 sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" />
              New Article
            </button>
            <button
              type="button"
              onClick={openNewProjectEditor}
              className="hidden items-center gap-1.5 border border-white/25 px-3.5 py-2 text-xs font-semibold tracking-wider text-white uppercase transition hover:border-white md:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" />
              New Project
            </button>
            {unreadMessagesCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection("messages")}
                className="inline-flex items-center gap-1.5 border border-white bg-white/10 px-3 py-2 font-mono text-xs font-bold text-white"
                title="Unread Contact Inquiries"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{unreadMessagesCount}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadAllDashboardData()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white hover:text-white disabled:opacity-50"
              title="Refresh Live Database Telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          {initialLoading ? (
            <div className="space-y-6">
              <TableSkeleton rows={4} />
              <TableSkeleton rows={6} />
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* 1. DASHBOARD OVERVIEW                                     */}
              {/* ========================================================= */}
              {activeSection === "dashboard" && overview && (
                <div className="space-y-8">
                  {/* Quick Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border border-white/15 bg-white/[0.02] p-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                        Quick Operations
                      </p>
                      <p className="mt-0.5 text-xs text-white/80">
                        Direct shortcuts to frequent publishing and administration workflows
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openNewBlogEditor}
                        className="inline-flex items-center gap-1.5 bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create New Blog Post
                      </button>
                      <button
                        type="button"
                        onClick={openNewProjectEditor}
                        className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase transition hover:border-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add New Project
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection("emailCenter")}
                        className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase transition hover:border-white"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Email Center
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection("messages")}
                        className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase transition hover:border-white"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Contact Messages ({unreadMessagesCount} unread)
                      </button>
                    </div>
                  </div>

                  {/* 8 Core Executive Overview Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: "Total Users",
                        value: overview.stats.users.total,
                        comparison: `${overview.stats.users.active} active · ${overview.stats.users.suspended} suspended`,
                        icon: Users,
                        target: "users" as AdminNavSection,
                      },
                      {
                        label: "New Registrations",
                        value:
                          overview.comparisons?.usersRegistered.last30Days ??
                          overview.stats.users.newLast30d ??
                          0,
                        comparison: overview.comparisons
                          ? `Last 30 days (prev 30d: ${overview.comparisons.usersRegistered.prev30Days})`
                          : "Joined in the last 30 days",
                        icon: UserPlus,
                        target: "users" as AdminNavSection,
                      },
                      {
                        label: "Verified Users",
                        value:
                          overview.stats.users.verified ??
                          usersSummary?.verified ??
                          overview.stats.users.active,
                        comparison: `${overview.stats.users.unverified ?? usersSummary?.unverified ?? 0} pending verification`,
                        icon: CheckCircle2,
                        target: "users" as AdminNavSection,
                      },
                      {
                        label: "Admin Accounts",
                        value: overview.stats.users.admins,
                        comparison: `${overview.stats.users.editors ?? 0} Editor account(s)`,
                        icon: UserCheck,
                        target: "roles" as AdminNavSection,
                      },
                      {
                        label: "Published Blog Posts",
                        value: overview.stats.blogs.published,
                        comparison: `${overview.stats.blogs.total} total (${overview.stats.blogs.drafts} drafts)`,
                        icon: BookOpen,
                        target: "blogs" as AdminNavSection,
                      },
                      {
                        label: "Total Projects",
                        value: overview.stats.projects.total,
                        comparison: `${overview.stats.projects.published} published · ${overview.stats.projects.drafts} drafts`,
                        icon: FolderKanban,
                        target: "projects" as AdminNavSection,
                      },
                      {
                        label: "Unread Contact Messages",
                        value: unreadMessagesCount,
                        comparison: `${overview.stats.messages.total} total messages in inbox`,
                        icon: Mail,
                        target: "messages" as AdminNavSection,
                      },
                      {
                        label: "Recent Admin Activity",
                        value: overview.recentActivity.length,
                        comparison: "Latest audited administrative & security events",
                        icon: Activity,
                        target: "audit" as AdminNavSection,
                      },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <button
                          key={stat.label}
                          type="button"
                          onClick={() => setActiveSection(stat.target)}
                          className="group flex flex-col justify-between border border-white/15 bg-white/[0.02] p-5 text-left transition hover:border-white"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-white/65">
                              {stat.label}
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center border border-white/15 bg-white/5 transition group-hover:bg-white group-hover:text-navy">
                              <Icon className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="font-mono text-3xl font-bold text-white">{stat.value}</p>
                            <p className="mt-1.5 text-[11px] text-white/60">{stat.comparison}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Overview Analytics Charts */}
                  {overview.monthlySeries && overview.monthlySeries.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-2">
                      <BarChartCard
                        title="Monthly Content Creation"
                        subtitle="Real 6-month history of blog posts & projects authored"
                        primaryLabel="Blog Posts"
                        secondaryLabel="Projects"
                        data={overview.monthlySeries.map((pt) => ({
                          label: pt.label,
                          primary: pt.blogsTotal,
                          secondary: pt.projectsTotal,
                        }))}
                      />
                      <BarChartCard
                        title="User Registrations & Contact Inquiries"
                        subtitle="Real 6-month trend of new user accounts and inbound messages"
                        primaryLabel="Users Registered"
                        secondaryLabel="Messages Received"
                        data={overview.monthlySeries.map((pt) => ({
                          label: pt.label,
                          primary: pt.usersRegistered,
                          secondary: pt.messagesReceived,
                        }))}
                      />
                    </div>
                  )}

                  {/* Recent Activity Panels */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Blog Posts */}
                    <div className="border border-white/15 bg-white/[0.02] p-5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                          Recently Updated Blog Posts
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveSection("blogs")}
                          className="font-mono text-[10px] text-white/75 uppercase hover:text-white"
                        >
                          Manage All →
                        </button>
                      </div>
                      <div className="mt-3 divide-y divide-white/10">
                        {(overview.recentBlogs || blogs.slice(0, 5)).map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-3 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{b.title}</p>
                              <p className="font-mono text-[10px] text-white/55">
                                /{b.slug} · Updated {new Date(b.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 font-mono text-[10px] ${
                                b.status === "PUBLISHED"
                                  ? "bg-white font-bold text-navy"
                                  : "border border-white/25 text-white/75"
                              }`}
                            >
                              {b.status}
                            </span>
                          </div>
                        ))}
                        {blogs.length === 0 && (
                          <p className="py-4 text-xs text-white/50">No blog posts created yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Projects */}
                    <div className="border border-white/15 bg-white/[0.02] p-5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                          Recently Updated Projects
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveSection("projects")}
                          className="font-mono text-[10px] text-white/75 uppercase hover:text-white"
                        >
                          Manage All →
                        </button>
                      </div>
                      <div className="mt-3 divide-y divide-white/10">
                        {(overview.recentProjects || projects.slice(0, 5)).map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{p.title}</p>
                              <p className="font-mono text-[10px] text-white/55">
                                /{p.slug} · Updated {new Date(p.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 font-mono text-[10px] ${
                                p.status === "PUBLISHED"
                                  ? "bg-white font-bold text-navy"
                                  : "border border-white/25 text-white/75"
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                        ))}
                        {projects.length === 0 && (
                          <p className="py-4 text-xs text-white/50">No projects created yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Contact Messages & Registered Users */}
                    <div className="border border-white/15 bg-white/[0.02] p-5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                          Recent Contact Messages & Users
                        </h3>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveSection("messages")}
                            className="font-mono text-[10px] text-white/75 uppercase hover:text-white"
                          >
                            Inbox →
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSection("users")}
                            className="font-mono text-[10px] text-white/75 uppercase hover:text-white"
                          >
                            Users →
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 divide-y divide-white/10">
                        {(overview.recentMessages || messages.slice(0, 3)).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{m.subject}</p>
                              <p className="font-mono text-[10px] text-white/60">
                                From {m.name} ({m.email})
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 font-mono text-[10px] ${
                                m.status === "NEW"
                                  ? "bg-white font-bold text-navy"
                                  : "border border-white/25 text-white/75"
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                        ))}
                        {(overview.recentUsers || users.slice(0, 3)).map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between gap-3 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">{u.name}</p>
                              <p className="font-mono text-[10px] text-white/55">
                                {u.email} · Joined {new Date(u.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="border border-white/20 px-2 py-0.5 font-mono text-[10px] text-white">
                              {u.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Administrator Audit Actions */}
                    <div className="border border-white/15 bg-white/[0.02] p-5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                          Recent Administrator Actions
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveSection("audit")}
                          className="font-mono text-[10px] text-white/75 uppercase hover:text-white"
                        >
                          Full Audit Log →
                        </button>
                      </div>
                      <div className="mt-3 divide-y divide-white/10 font-mono text-[11px]">
                        {overview.recentActivity.slice(0, 6).map((act) => (
                          <div
                            key={act.id}
                            className="flex items-center justify-between gap-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-white">{act.action}</span>
                              <p className="truncate text-[10px] text-white/55">
                                {act.actorEmail || "system"} · {act.category}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-white/60">
                              {new Date(act.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 2. BLOG MANAGEMENT (LISTING + RICH EDITOR / PREVIEW)      */}
              {/* ========================================================= */}
              {activeSection === "blogs" && (
                <div className="space-y-6">
                  {blogEditorOpen ? (
                    <div className="border border-white/20 bg-white/[0.02] p-6">
                      {/* Editor Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                            {editingBlogId ? "Editing Article" : "New Technical Article"}
                          </p>
                          <h2 className="mt-0.5 text-lg font-bold text-white">
                            {blogTitle || "Untitled Blog Article"}
                          </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Write / Live Preview Mode Switch */}
                          <div className="flex border border-white/25">
                            <button
                              type="button"
                              onClick={() => setBlogEditorMode("write")}
                              className={`px-3.5 py-1.5 text-xs font-semibold uppercase ${
                                blogEditorMode === "write"
                                  ? "bg-white text-navy"
                                  : "text-white/75 hover:text-white"
                              }`}
                            >
                              Editor
                            </button>
                            <button
                              type="button"
                              onClick={() => setBlogEditorMode("preview")}
                              className={`px-3.5 py-1.5 text-xs font-semibold uppercase ${
                                blogEditorMode === "preview"
                                  ? "bg-white text-navy"
                                  : "text-white/75 hover:text-white"
                              }`}
                            >
                              Preview
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveBlogArticle("DRAFT")}
                            className="border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white uppercase hover:border-white disabled:opacity-50"
                          >
                            Save Draft
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveBlogArticle("PUBLISHED")}
                            className="bg-white px-4 py-1.5 text-xs font-bold text-navy uppercase transition hover:bg-white/90 disabled:opacity-50"
                          >
                            {saving
                              ? "Saving..."
                              : editingBlogId
                                ? "Update & Publish"
                                : "Publish Now"}
                          </button>

                          {editingBlogId && (
                            <button
                              type="button"
                              onClick={() => {
                                const found = blogs.find((b) => b.id === editingBlogId);
                                if (found) confirmDeleteBlog(found);
                              }}
                              className="border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/80 uppercase hover:border-white hover:text-white"
                            >
                              Delete
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setBlogEditorOpen(false)}
                            className="border border-white/20 px-3 py-1.5 text-xs text-white/70 uppercase hover:border-white hover:text-white"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      {blogEditorMode === "preview" ? (
                        /* Live Article Preview Mode (Preserves all state) */
                        <div className="mx-auto max-w-3xl space-y-6 py-8">
                          <div className="border-b border-white/15 pb-6">
                            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-white/60">
                              <span className="border border-white/25 px-2 py-0.5 text-[10px] text-white uppercase">
                                {blogStatus}
                              </span>
                              <span>{estimatedReadingTime} min read</span>
                              <span>/{blogSlug || slugifyText(blogTitle)}</span>
                            </div>
                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
                              {blogTitle || "Untitled Article"}
                            </h1>
                            {blogExcerpt && (
                              <p className="mt-3 text-base leading-relaxed text-white/75">
                                {blogExcerpt}
                              </p>
                            )}
                          </div>

                          {blogCoverImage?.url && (
                            <div className="overflow-hidden border border-white/20">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={blogCoverImage.url}
                                alt={blogCoverImage.alt || blogTitle}
                                className="max-h-96 w-full object-cover"
                              />
                            </div>
                          )}

                          <div
                            className="article-content max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: blogContent }}
                          />
                        </div>
                      ) : (
                        /* Rich Writing Interface */
                        <div className="mt-6 grid gap-6 lg:grid-cols-12">
                          <div className="space-y-5 lg:col-span-8">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                  Blog Title
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={blogTitle}
                                  onChange={(e) => {
                                    setBlogTitle(e.target.value);
                                    if (!editingBlogId) setBlogSlug(slugifyText(e.target.value));
                                  }}
                                  placeholder="e.g. Architecting Zero-Trust APIs with Bun & TypeScript"
                                  className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                  URL Slug
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={blogSlug}
                                  onChange={(e) => setBlogSlug(slugifyText(e.target.value))}
                                  placeholder="architecting-zero-trust-apis"
                                  className="w-full border border-white/25 bg-navy px-3.5 py-2.5 font-mono text-sm text-white focus:border-white focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Short Description / Excerpt
                              </label>
                              <textarea
                                rows={2}
                                value={blogExcerpt}
                                onChange={(e) => setBlogExcerpt(e.target.value)}
                                placeholder="Concise summary displayed on blog cards and feeds (auto-filled from content if left blank)..."
                                className="w-full border border-white/25 bg-navy px-3.5 py-2 text-sm text-white focus:border-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <div className="mb-1.5 flex items-center justify-between">
                                <label className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                                  Article Body (Rich Text, Code Blocks, Headings, Lists, Links, Images)
                                </label>
                                <span className="font-mono text-[10px] text-white/60">
                                  Est. Reading Time: {estimatedReadingTime} min
                                </span>
                              </div>
                              <RichTextEditor content={blogContent} onChange={setBlogContent} />
                            </div>
                          </div>

                          {/* Right Sidebar: Cover Image, Taxonomy, Publishing, SEO */}
                          <div className="space-y-5 lg:col-span-4">
                            {/* Featured Image */}
                            <div className="border border-white/15 bg-navy p-4">
                              <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Featured Cover Image
                              </label>
                              {blogCoverImage?.url ? (
                                <div className="space-y-2.5">
                                  <div className="aspect-video w-full overflow-hidden border border-white/15">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={blogCoverImage.url}
                                      alt={blogCoverImage.alt || blogTitle}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setMediaPickerTarget("blogCover")}
                                      className="flex-1 border border-white/25 py-1.5 text-xs font-semibold text-white uppercase hover:border-white"
                                    >
                                      Change
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBlogCoverImage(undefined)}
                                      className="border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white hover:text-white"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setMediaPickerTarget("blogCover")}
                                  className="flex aspect-video w-full flex-col items-center justify-center border border-dashed border-white/25 p-4 text-center transition hover:border-white"
                                >
                                  <ImageIcon className="h-5 w-5 text-white/70" />
                                  <span className="mt-1.5 text-xs font-semibold text-white">
                                    Upload or Choose Cover Image
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Status & Scheduling */}
                            <div className="space-y-3 border border-white/15 bg-navy p-4">
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Publication Status & Scheduling
                              </label>
                              <select
                                value={blogStatus}
                                onChange={(e) =>
                                  setBlogStatus(
                                    e.target.value as "DRAFT" | "PUBLISHED" | "SCHEDULED"
                                  )
                                }
                                className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                              >
                                <option value="DRAFT">DRAFT</option>
                                <option value="PUBLISHED">PUBLISHED</option>
                                <option value="SCHEDULED">SCHEDULED</option>
                              </select>

                              {blogStatus === "SCHEDULED" && (
                                <div>
                                  <label className="mb-1 block font-mono text-[10px] uppercase text-white/60">
                                    Scheduled Publish Date & Time
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={blogScheduledAt}
                                    onChange={(e) => setBlogScheduledAt(e.target.value)}
                                    className="w-full border border-white/25 bg-navy px-3 py-2 font-mono text-xs text-white focus:border-white focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void saveBlogArticle("SCHEDULED")}
                                    className="mt-2 w-full bg-white py-2 text-xs font-bold text-navy uppercase"
                                  >
                                    Schedule Publication
                                  </button>
                                </div>
                              )}

                              <label className="flex items-center gap-2 pt-1 text-xs text-white/85">
                                <input
                                  type="checkbox"
                                  checked={blogFeatured}
                                  onChange={(e) => setBlogFeatured(e.target.checked)}
                                  className="h-4 w-4 accent-white"
                                />
                                Pin as Featured Article
                              </label>
                            </div>

                            {/* Category & Multi-Tags */}
                            <div className="space-y-3 border border-white/15 bg-navy p-4">
                              <div>
                                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                  Category
                                </label>
                                <select
                                  value={blogCategoryId}
                                  onChange={(e) => setBlogCategoryId(e.target.value)}
                                  className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                                >
                                  <option value="">Uncategorized</option>
                                  {categories
                                    .filter((c) => c.type === "BLOG")
                                    .map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                  Tags ({blogSelectedTagIds.length} selected)
                                </label>
                                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                                  {tags.map((t) => {
                                    const active = blogSelectedTagIds.includes(t.id);
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() =>
                                          setBlogSelectedTagIds((prev) =>
                                            active
                                              ? prev.filter((id) => id !== t.id)
                                              : [...prev, t.id]
                                          )
                                        }
                                        className={`px-2.5 py-1 font-mono text-[10px] transition ${
                                          active
                                            ? "bg-white font-bold text-navy"
                                            : "border border-white/20 text-white/70 hover:border-white"
                                        }`}
                                      >
                                        #{t.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* SEO Metadata */}
                            <div className="space-y-3 border border-white/15 bg-navy p-4">
                              <p className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Search Engine Optimization (SEO)
                              </p>
                              <div>
                                <label className="mb-1 block font-mono text-[10px] text-white/55">
                                  SEO Title ({blogSeoTitle.length}/70)
                                </label>
                                <input
                                  type="text"
                                  value={blogSeoTitle}
                                  onChange={(e) => setBlogSeoTitle(e.target.value)}
                                  placeholder={blogTitle || "Custom SEO title..."}
                                  className="w-full border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block font-mono text-[10px] text-white/55">
                                  SEO Meta Description ({blogSeoDescription.length}/160)
                                </label>
                                <textarea
                                  rows={3}
                                  value={blogSeoDescription}
                                  onChange={(e) => setBlogSeoDescription(e.target.value)}
                                  placeholder={blogExcerpt || "Custom meta description..."}
                                  className="w-full border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Blog Listing View */
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
                        <div className="flex flex-1 flex-wrap items-center gap-2.5">
                          <div className="relative min-w-[220px] flex-1">
                            <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
                            <input
                              type="text"
                              value={blogSearch}
                              onChange={(e) => setBlogSearch(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && void fetchBlogs(1)}
                              placeholder="Search articles by title, excerpt, or content..."
                              className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
                            />
                          </div>

                          <select
                            value={blogStatusFilter}
                            onChange={(e) => setBlogStatusFilter(e.target.value)}
                            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                          >
                            <option value="">All Statuses</option>
                            <option value="PUBLISHED">PUBLISHED</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="SCHEDULED">SCHEDULED</option>
                          </select>

                          <select
                            value={blogCategoryFilter}
                            onChange={(e) => setBlogCategoryFilter(e.target.value)}
                            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                          >
                            <option value="">All Categories</option>
                            {categories
                              .filter((c) => c.type === "BLOG")
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>

                          <select
                            value={blogSort}
                            onChange={(e) =>
                              setBlogSort(e.target.value as "newest" | "oldest" | "title")
                            }
                            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                          >
                            <option value="newest">Sort: Newest</option>
                            <option value="oldest">Sort: Oldest</option>
                            <option value="title">Sort: Title (A–Z)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => void fetchBlogs(1)}
                            className="border border-white/25 px-3.5 py-2 text-xs font-semibold text-white uppercase hover:border-white"
                          >
                            Search
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={openNewBlogEditor}
                          className="inline-flex items-center gap-1.5 bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create Blog Post
                        </button>
                      </div>

                      {/* Bulk Actions Bar */}
                      {selectedBlogIds.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border border-white bg-white/10 px-4 py-2.5">
                          <span className="font-mono text-xs font-bold text-white">
                            {selectedBlogIds.length} article(s) selected
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleBulkBlogAction("PUBLISH")}
                              className="bg-white px-3 py-1 font-mono text-[10px] font-bold text-navy uppercase"
                            >
                              Publish Selected
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkBlogAction("DRAFT")}
                              className="border border-white/40 px-3 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                            >
                              Move to Draft
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkBlogAction("DELETE")}
                              className="border border-white/40 px-3 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                            >
                              Delete Selected
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedBlogIds([])}
                              className="px-2 py-1 font-mono text-[10px] text-white/70 uppercase hover:text-white"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}

                      {blogsLoading ? (
                        <TableSkeleton rows={6} />
                      ) : blogs.length === 0 ? (
                        <EmptyState
                          title="No blog articles found"
                          description="Start publishing technical articles, engineering deep-dives, and tutorials."
                          actionLabel="Create First Blog Post"
                          onAction={openNewBlogEditor}
                        />
                      ) : (
                        <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
                              <tr>
                                <th className="w-10 px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={
                                      blogs.length > 0 && selectedBlogIds.length === blogs.length
                                    }
                                    onChange={(e) =>
                                      setSelectedBlogIds(
                                        e.target.checked ? blogs.map((b) => b.id) : []
                                      )
                                    }
                                    className="h-3.5 w-3.5 accent-white"
                                    aria-label="Select all articles"
                                  />
                                </th>
                                <th className="px-4 py-3">Article</th>
                                <th className="px-4 py-3">Author</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Reading Time</th>
                                <th className="px-4 py-3">Created / Updated</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {blogs.map((blog) => {
                                const selected = selectedBlogIds.includes(blog.id);
                                const authorName =
                                  typeof blog.author === "object" && blog.author?.name
                                    ? blog.author.name
                                    : currentAdmin?.name || "Zaakir";
                                return (
                                  <tr key={blog.id} className="hover:bg-white/[0.02]">
                                    <td className="px-4 py-3">
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={(e) =>
                                          setSelectedBlogIds((prev) =>
                                            e.target.checked
                                              ? [...prev, blog.id]
                                              : prev.filter((id) => id !== blog.id)
                                          )
                                        }
                                        className="h-3.5 w-3.5 accent-white"
                                        aria-label={`Select ${blog.title}`}
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-14 shrink-0 overflow-hidden border border-white/15 bg-white/5">
                                          {blog.coverImage?.url ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                              src={blog.coverImage.url}
                                              alt={blog.title}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center font-mono text-[9px] text-white/40">
                                              NO IMG
                                            </div>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="truncate font-semibold text-white">
                                            {blog.title}
                                          </p>
                                          <p className="truncate font-mono text-[10px] text-white/55">
                                            /{blog.slug}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-white/80">{authorName}</td>
                                    <td className="px-4 py-3">
                                      <span className="border border-white/20 px-2 py-0.5 font-mono text-[10px] text-white/80">
                                        {blog.category?.name || "Uncategorized"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`px-2 py-0.5 font-mono text-[10px] font-bold ${
                                          blog.status === "PUBLISHED"
                                            ? "bg-white text-navy"
                                            : "border border-white/25 text-white/80"
                                        }`}
                                      >
                                        {blog.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-white/70">
                                      {blog.readingTime || 1} min
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[10px] text-white/60">
                                      <div>C: {new Date(blog.createdAt).toLocaleDateString()}</div>
                                      <div>U: {new Date(blog.updatedAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="inline-flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => openEditBlog(blog)}
                                          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => confirmDeleteBlog(blog)}
                                          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white/75 uppercase hover:border-white hover:text-white"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <PaginationBar
                        page={blogsMeta.page}
                        totalPages={blogsMeta.totalPages}
                        total={blogsMeta.total}
                        label="articles"
                        onPageChange={(next) => {
                          setBlogPage(next);
                          void fetchBlogs(next);
                        }}
                      />
                    </>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 3. PROJECT MANAGEMENT (LISTING + RICH EDITOR/SCREENSHOTS) */}
              {/* ========================================================= */}
              {activeSection === "projects" && (
                <div className="space-y-6">
                  {projectEditorOpen ? (
                    <form
                      onSubmit={handleSaveProject}
                      className="space-y-6 border border-white/20 bg-white/[0.02] p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                            {editingProjectId ? "Editing Portfolio Project" : "New Portfolio Project"}
                          </p>
                          <h2 className="mt-0.5 text-lg font-bold text-white">
                            {projectTitle || "Untitled Engineering Project"}
                          </h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="bg-white px-5 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90 disabled:opacity-50"
                          >
                            {saving
                              ? "Saving..."
                              : editingProjectId
                                ? "Update Project"
                                : "Save Project"}
                          </button>
                          {editingProjectId && (
                            <button
                              type="button"
                              onClick={() => {
                                const found = projects.find((p) => p.id === editingProjectId);
                                if (found) confirmDeleteProject(found);
                              }}
                              className="border border-white/25 px-3.5 py-2 text-xs font-semibold text-white uppercase hover:border-white"
                            >
                              Delete
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setProjectEditorOpen(false)}
                            className="border border-white/20 px-3.5 py-2 text-xs text-white/75 uppercase hover:border-white hover:text-white"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-12">
                        <div className="space-y-5 lg:col-span-8">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Project Title
                              </label>
                              <input
                                type="text"
                                required
                                value={projectTitle}
                                onChange={(e) => {
                                  setProjectTitle(e.target.value);
                                  if (!editingProjectId)
                                    setProjectSlug(slugifyText(e.target.value));
                                }}
                                placeholder="e.g. Dezaakir Distributed AI Publishing Platform"
                                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                URL Slug
                              </label>
                              <input
                                type="text"
                                required
                                value={projectSlug}
                                onChange={(e) => setProjectSlug(slugifyText(e.target.value))}
                                placeholder="dezaakir-platform"
                                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 font-mono text-sm text-white focus:border-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                              Short Summary
                            </label>
                            <textarea
                              rows={2}
                              required
                              value={projectSummary}
                              onChange={(e) => setProjectSummary(e.target.value)}
                              placeholder="Concise one-sentence summary of the project..."
                              className="w-full border border-white/25 bg-navy px-3.5 py-2 text-sm text-white focus:border-white focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                              Detailed Case Study & Architecture Description
                            </label>
                            <RichTextEditor
                              content={projectDescription}
                              onChange={setProjectDescription}
                            />
                          </div>

                          {/* Multiple Project Screenshots Manager */}
                          <div className="border border-white/15 bg-navy p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                  Project Screenshots Gallery ({projectScreenshots.length})
                                </h4>
                                <p className="mt-0.5 text-[11px] text-white/60">
                                  Add multiple screenshots to showcase interfaces and architecture diagrams
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMediaPickerTarget("projectScreenshot")}
                                className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 text-xs font-bold text-navy uppercase"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add Screenshot
                              </button>
                            </div>

                            {projectScreenshots.length > 0 && (
                              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {projectScreenshots.map((shot, idx) => (
                                  <div
                                    key={`${shot.publicId}-${idx}`}
                                    className="group relative border border-white/20 bg-white/5"
                                  >
                                    <div className="aspect-video w-full overflow-hidden">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={shot.url}
                                        alt={shot.alt || `Screenshot ${idx + 1}`}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setProjectScreenshots((prev) =>
                                          prev.filter((_, i) => i !== idx)
                                        )
                                      }
                                      className="w-full border-t border-white/15 bg-navy py-1 font-mono text-[10px] text-white/80 uppercase hover:text-white"
                                    >
                                      Remove Screenshot
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-5 lg:col-span-4">
                          {/* Project Thumbnail */}
                          <div className="border border-white/15 bg-navy p-4">
                            <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                              Project Thumbnail Image
                            </label>
                            {projectCoverImage?.url ? (
                              <div className="space-y-2.5">
                                <div className="aspect-video w-full overflow-hidden border border-white/15">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={projectCoverImage.url}
                                    alt={projectCoverImage.alt || projectTitle}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setMediaPickerTarget("projectThumb")}
                                    className="flex-1 border border-white/25 py-1.5 text-xs font-semibold text-white uppercase hover:border-white"
                                  >
                                    Change
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setProjectCoverImage(undefined)}
                                    className="border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white hover:text-white"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setMediaPickerTarget("projectThumb")}
                                className="flex aspect-video w-full flex-col items-center justify-center border border-dashed border-white/25 p-4 text-center transition hover:border-white"
                              >
                                <ImageIcon className="h-5 w-5 text-white/70" />
                                <span className="mt-1.5 text-xs font-semibold text-white">
                                  Upload or Select Thumbnail
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Technologies & Links */}
                          <div className="space-y-3 border border-white/15 bg-navy p-4">
                            <div>
                              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Technologies Used (Comma Separated)
                              </label>
                              <input
                                type="text"
                                required
                                value={projectTechInput}
                                onChange={(e) => setProjectTechInput(e.target.value)}
                                placeholder="TypeScript, Next.js, Bun, MongoDB"
                                className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                GitHub Repository URL
                              </label>
                              <input
                                type="url"
                                value={projectGithubUrl}
                                onChange={(e) => setProjectGithubUrl(e.target.value)}
                                placeholder="https://github.com/..."
                                className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Live Demo URL
                              </label>
                              <input
                                type="url"
                                value={projectLiveUrl}
                                onChange={(e) => setProjectLiveUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Publication & Category */}
                          <div className="space-y-3 border border-white/15 bg-navy p-4">
                            <div>
                              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Publication Status
                              </label>
                              <select
                                value={projectStatus}
                                onChange={(e) =>
                                  setProjectStatus(e.target.value as "DRAFT" | "PUBLISHED")
                                }
                                className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                              >
                                <option value="PUBLISHED">PUBLISHED</option>
                                <option value="DRAFT">DRAFT</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Category
                              </label>
                              <select
                                value={projectCategoryId}
                                onChange={(e) => setProjectCategoryId(e.target.value)}
                                className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                              >
                                <option value="">Uncategorized</option>
                                {categories
                                  .filter((c) => c.type === "PROJECT")
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                                Display Order (Lower appears first)
                              </label>
                              <input
                                type="number"
                                value={projectOrder}
                                onChange={(e) => setProjectOrder(Number(e.target.value))}
                                className="w-full border border-white/25 bg-navy px-3 py-2 font-mono text-xs text-white focus:border-white focus:outline-none"
                              />
                            </div>

                            <label className="flex items-center gap-2 pt-1 text-xs text-white/85">
                              <input
                                type="checkbox"
                                checked={projectFeatured}
                                onChange={(e) => setProjectFeatured(e.target.checked)}
                                className="h-4 w-4 accent-white"
                              />
                              Feature on Homepage
                            </label>
                          </div>

                          {/* Project SEO */}
                          <div className="space-y-3 border border-white/15 bg-navy p-4">
                            <p className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                              Project SEO Metadata
                            </p>
                            <input
                              type="text"
                              value={projectSeoTitle}
                              onChange={(e) => setProjectSeoTitle(e.target.value)}
                              placeholder="Custom SEO Title..."
                              className="w-full border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                            />
                            <textarea
                              rows={3}
                              value={projectSeoDescription}
                              onChange={(e) => setProjectSeoDescription(e.target.value)}
                              placeholder="Custom SEO Meta Description..."
                              className="w-full border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* Project Listing View */
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
                        <div className="flex flex-1 flex-wrap items-center gap-2.5">
                          <div className="relative min-w-[220px] flex-1">
                            <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
                            <input
                              type="text"
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && void fetchProjects(1)}
                              placeholder="Search projects by title, summary, or technology..."
                              className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
                            />
                          </div>

                          <select
                            value={projectStatusFilter}
                            onChange={(e) => setProjectStatusFilter(e.target.value)}
                            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                          >
                            <option value="">All Statuses</option>
                            <option value="PUBLISHED">PUBLISHED</option>
                            <option value="DRAFT">DRAFT</option>
                          </select>

                          <select
                            value={projectCategoryFilter}
                            onChange={(e) => setProjectCategoryFilter(e.target.value)}
                            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                          >
                            <option value="">All Categories</option>
                            {categories
                              .filter((c) => c.type === "PROJECT")
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>

                          <select
                            value={projectSort}
                            onChange={(e) =>
                              setProjectSort(e.target.value as "newest" | "oldest" | "title")
                            }
                            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                          >
                            <option value="newest">Sort: Default / Newest</option>
                            <option value="oldest">Sort: Oldest</option>
                            <option value="title">Sort: Title (A–Z)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => void fetchProjects(1)}
                            className="border border-white/25 px-3.5 py-2 text-xs font-semibold text-white uppercase hover:border-white"
                          >
                            Search
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={openNewProjectEditor}
                          className="inline-flex items-center gap-1.5 bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add New Project
                        </button>
                      </div>

                      {projectsLoading ? (
                        <TableSkeleton rows={5} />
                      ) : projects.length === 0 ? (
                        <EmptyState
                          title="No portfolio projects found"
                          description="Add software engineering projects with screenshots, tech stacks, and repository links."
                          actionLabel="Add First Project"
                          onAction={openNewProjectEditor}
                        />
                      ) : (
                        <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
                              <tr>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Technologies</th>
                                <th className="px-4 py-3">Links</th>
                                <th className="px-4 py-3">Featured</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {projects.map((proj) => (
                                <tr key={proj.id} className="hover:bg-white/[0.02]">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-14 shrink-0 overflow-hidden border border-white/15 bg-white/5">
                                        {proj.coverImage?.url ? (
                                          /* eslint-disable-next-line @next/next/no-img-element */
                                          <img
                                            src={proj.coverImage.url}
                                            alt={proj.title}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center font-mono text-[9px] text-white/40">
                                            NO IMG
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-white">{proj.title}</p>
                                        <p className="font-mono text-[10px] text-white/55">
                                          /{proj.slug} · {(proj.images || []).length} screenshot(s)
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {(proj.technologies || []).slice(0, 4).map((t) => (
                                        <span
                                          key={t}
                                          className="border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white/80"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[10px] text-white/75">
                                    <div className="flex gap-2">
                                      {proj.githubUrl && (
                                        <a
                                          href={proj.githubUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="underline hover:text-white"
                                        >
                                          GitHub
                                        </a>
                                      )}
                                      {proj.liveUrl && (
                                        <a
                                          href={proj.liveUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="underline hover:text-white"
                                        >
                                          Live
                                        </a>
                                      )}
                                      {!proj.githubUrl && !proj.liveUrl && "—"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[10px]">
                                    {proj.featured ? (
                                      <span className="border border-white px-2 py-0.5 text-white">
                                        FEATURED
                                      </span>
                                    ) : (
                                      <span className="text-white/45">Standard</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-2 py-0.5 font-mono text-[10px] font-bold ${
                                        proj.status === "PUBLISHED"
                                          ? "bg-white text-navy"
                                          : "border border-white/25 text-white/80"
                                      }`}
                                    >
                                      {proj.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openEditProject(proj)}
                                        className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => confirmDeleteProject(proj)}
                                        className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white/75 uppercase hover:border-white hover:text-white"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <PaginationBar
                        page={projectsMeta.page}
                        totalPages={projectsMeta.totalPages}
                        total={projectsMeta.total}
                        label="projects"
                        onPageChange={(next) => {
                          setProjectPage(next);
                          void fetchProjects(next);
                        }}
                      />
                    </>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 4. CATEGORIES AND TAGS MANAGEMENT                         */}
              {/* ========================================================= */}
              {(activeSection === "taxonomy" ||
                activeSection === "categories" ||
                activeSection === "tags") && (
                <AdminTaxonomyCombinedView
                  categories={categories}
                  tags={tags}
                  onSaveCategory={handleSaveCategory}
                  onDeleteCategory={confirmDeleteCategory}
                  onSaveTag={handleSaveTag}
                  onDeleteTag={confirmDeleteTag}
                />
              )}

              {/* ========================================================= */}
              {/* 6. MEDIA LIBRARY                                          */}
              {/* ========================================================= */}
              {activeSection === "media" && (
                <AdminMediaLibraryView
                  media={media}
                  loading={mediaLoading}
                  uploading={uploadingMedia}
                  search={mediaSearch}
                  setSearch={setMediaSearch}
                  folderFilter={mediaFolderFilter}
                  setFolderFilter={setMediaFolderFilter}
                  uploadFolder={uploadFolder}
                  setUploadFolder={setUploadFolder}
                  uploadAlt={uploadAlt}
                  setUploadAlt={setUploadAlt}
                  onSearch={() => void fetchMedia()}
                  onUploadFile={handleUploadMediaFile}
                  onCopyUrl={(url) => {
                    void navigator.clipboard.writeText(url);
                    pushToast("success", "Copied to clipboard", url);
                  }}
                  onDeleteMedia={confirmDeleteMedia}
                />
              )}

              {/* ========================================================= */}
              {/* 7. CONTACT MESSAGES                                       */}
              {/* ========================================================= */}
              {activeSection === "messages" && (
                <AdminAdvancedMessagesView
                  messages={messages}
                  counts={messagesCounts}
                  meta={messagesMeta}
                  loading={messagesLoading}
                  statusFilter={messageStatusFilter}
                  setStatusFilter={setMessageStatusFilter}
                  search={messageSearch}
                  setSearch={setMessageSearch}
                  selectedIds={selectedMessageIds}
                  setSelectedIds={setSelectedMessageIds}
                  onSearch={() => void fetchMessages(1)}
                  onPageChange={(next) => {
                    setMessagePage(next);
                    void fetchMessages(next);
                  }}
                  onUpdateStatus={handleUpdateMessageStatus}
                  onDeleteMessage={confirmDeleteMessage}
                  onBulkAction={handleBulkMessagesAction}
                />
              )}

              {/* ========================================================= */}
              {/* 8. ADVANCED USER MANAGEMENT                               */}
              {/* ========================================================= */}
              {activeSection === "users" && (
                <AdminAdvancedUsersView
                  currentAdmin={currentAdmin}
                  users={users}
                  summary={usersSummary}
                  meta={usersMeta}
                  loading={usersLoading}
                  search={userSearch}
                  setSearch={setUserSearch}
                  roleFilter={userRoleFilter}
                  setRoleFilter={setUserRoleFilter}
                  statusFilter={userStatusFilter}
                  setStatusFilter={setUserStatusFilter}
                  verifiedFilter={userVerifiedFilter}
                  setVerifiedFilter={setUserVerifiedFilter}
                  sortBy={userSortBy}
                  sortOrder={userSortOrder}
                  onToggleSort={handleToggleUserSort}
                  onSearch={() => void fetchUsers(1)}
                  onPageChange={(next) => {
                    setUserPage(next);
                    void fetchUsers(next);
                  }}
                  onUpdateUserStatus={handleUpdateUser}
                  onChangeUserRole={handleChangeUserRole}
                  onInspectUser={handleInspectUser}
                  onRevokeSessions={handleRevokeUserSessions}
                  onEmailUser={handleEmailSingleUser}
                  inspectedUser={inspectedUser}
                  inspectedSessions={inspectedSessions}
                  inspectedActivity={inspectedActivity}
                  onCloseInspector={() => setInspectedUser(null)}
                />
              )}

              {/* ========================================================= */}
              {/* 8B. ROLES AND PERMISSIONS                                 */}
              {/* ========================================================= */}
              {activeSection === "roles" && (
                <AdminRolesPermissionsView
                  currentAdmin={currentAdmin}
                  users={users}
                  summary={usersSummary}
                  onChangeUserRole={handleChangeUserRole}
                  onNavigateToUsers={(role) => {
                    setUserRoleFilter(role);
                    setActiveSection("users");
                  }}
                />
              )}

              {/* ========================================================= */}
              {/* 8C. EMAIL NOTIFICATION CENTER                             */}
              {/* ========================================================= */}
              {activeSection === "emailCenter" && (
                <AdminEmailCenterView
                  users={users}
                  currentAdmin={currentAdmin}
                  recipientMode={emailRecipientMode}
                  setRecipientMode={setEmailRecipientMode}
                  selectedRecipientIds={selectedRecipientIds}
                  setSelectedRecipientIds={setSelectedRecipientIds}
                  subject={emailSubject}
                  setSubject={setEmailSubject}
                  bodyHtml={emailBodyHtml}
                  setBodyHtml={setEmailBodyHtml}
                  testEmail={emailTestAddress}
                  setTestEmail={setEmailTestAddress}
                  respectConsent={emailRespectConsent}
                  setRespectConsent={setEmailRespectConsent}
                  previewHtml={emailPreviewHtml}
                  previewLoading={emailPreviewLoading}
                  sending={emailSending}
                  lastCampaignResult={lastCampaignResult}
                  onGeneratePreview={() => void handlePreviewAdminEmail()}
                  onSendTestEmail={() => void handleSendTestEmail()}
                  onDispatchCampaign={handleDispatchCampaign}
                  onViewHistory={() => setActiveSection("emailHistory")}
                />
              )}

              {/* ========================================================= */}
              {/* 8D. EMAIL CAMPAIGN HISTORY                                */}
              {/* ========================================================= */}
              {activeSection === "emailHistory" && (
                <AdminEmailHistoryView
                  campaigns={campaigns}
                  meta={campaignsMeta}
                  loading={campaignsLoading}
                  search={campaignSearch}
                  setSearch={setCampaignSearch}
                  statusFilter={campaignStatusFilter}
                  setStatusFilter={setCampaignStatusFilter}
                  onSearch={() => void fetchEmailCampaigns(1)}
                  onPageChange={(next) => {
                    setCampaignPage(next);
                    void fetchEmailCampaigns(next);
                  }}
                  onInspectCampaign={(id) => void handleInspectCampaign(id)}
                  inspectedCampaign={inspectedCampaign}
                  onCloseInspector={() => setInspectedCampaign(null)}
                />
              )}

              {/* ========================================================= */}
              {/* 9. SYSTEM ANALYTICS                                       */}
              {/* ========================================================= */}
              {activeSection === "analytics" && (
                <AdminAnalyticsView overview={overview} blogs={blogs} projects={projects} />
              )}

              {/* ========================================================= */}
              {/* 10. SITE SETTINGS                                         */}
              {/* ========================================================= */}
              {activeSection === "settings" && settings && (
                <AdminSiteSettingsView
                  settings={settings}
                  setSettings={setSettings}
                  systemStatus={overview?.systemStatus}
                  saving={saving}
                  onSave={handleSaveSettings}
                  onOpenMediaPicker={(target) => setMediaPickerTarget(target)}
                />
              )}

              {/* ========================================================= */}
              {/* 11. SEO SETTINGS                                          */}
              {/* ========================================================= */}
              {activeSection === "seo" && settings && (
                <AdminSeoSettingsView
                  settings={settings}
                  setSettings={setSettings}
                  blogs={blogs}
                  projects={projects}
                  saving={saving}
                  onSave={handleSaveSettings}
                  onOpenMediaPicker={(target) => setMediaPickerTarget(target)}
                  onEditBlog={openEditBlog}
                  onEditProject={openEditProject}
                />
              )}

              {/* ========================================================= */}
              {/* 11B. SYSTEM SECURITY & ADMIN MFA                          */}
              {/* ========================================================= */}
              {activeSection === "security" && (
                <AdminSecurityCenterView
                  currentAdmin={currentAdmin}
                  securityLogs={auditLogs}
                  onSetupMfa={() => void handleSetupMfa()}
                  onEnableMfa={(code) => void handleEnableMfa(code)}
                  mfaSecret={mfaSecret}
                  mfaOtpauthUri={mfaOtpauthUri}
                  mfaRecoveryCodes={mfaRecoveryCodes}
                  mfaBusy={mfaBusy}
                  onOpenFullAuditLogs={() => setActiveSection("audit")}
                />
              )}

              {/* ========================================================= */}
              {/* 12. AUDIT LOGS                                            */}
              {/* ========================================================= */}
              {activeSection === "audit" && (
                <AdminAuditLogsView
                  logs={auditLogs}
                  meta={auditMeta}
                  loading={auditLoading}
                  categoryFilter={auditCategoryFilter}
                  setCategoryFilter={setAuditCategoryFilter}
                  outcomeFilter={auditOutcomeFilter}
                  setOutcomeFilter={setAuditOutcomeFilter}
                  actionSearch={auditActionSearch}
                  setActionSearch={setAuditActionSearch}
                  onSearch={() => void fetchAuditLogs(1)}
                  onPageChange={(next) => {
                    setAuditPage(next);
                    void fetchAuditLogs(next);
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Media Picker Modal */}
      <MediaPickerModal
        open={mediaPickerTarget !== null}
        defaultFolder={
          mediaPickerTarget === "blogCover"
            ? "blogs"
            : mediaPickerTarget === "projectThumb" || mediaPickerTarget === "projectScreenshot"
              ? "projects"
              : mediaPickerTarget === "profile"
                ? "profile"
                : "general"
        }
        onClose={() => setMediaPickerTarget(null)}
        onSelect={handleMediaPickerSelect}
      />

      {/* Global Confirmation Dialog */}
      <ConfirmDialog
        state={confirmState}
        busy={confirmBusy}
        onClose={() => {
          if (!confirmBusy) setConfirmState(null);
        }}
      />

      {/* Global Toast Notification Stack */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
