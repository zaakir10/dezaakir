"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Tags,
  Users,
  Image as ImageIcon,
  Mail,
  Settings,
  ShieldAlert,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Check,
  X,
  RefreshCw,
  Search,
  Lock,
  ExternalLink,
} from "lucide-react";
import { apiRequest, DEFAULT_SITE_SETTINGS } from "@/lib/api";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import type {
  AuditLogItem,
  BlogArticle,
  CategoryItem,
  ContactMessageItem,
  MediaItem,
  ProjectItem,
  SessionInfo,
  SiteSettingsData,
  TagItem,
  User,
} from "@/types";

type AdminTab =
  | "overview"
  | "blogs"
  | "projects"
  | "taxonomy"
  | "users"
  | "media"
  | "messages"
  | "settings"
  | "audit";

interface OverviewStats {
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  scheduledBlogs: number;
  totalProjects: number;
  publishedProjects: number;
  draftProjects: number;
  totalUsers: number;
  unverifiedUsers: number;
  suspendedUsers: number;
  totalMessages: number;
  unreadMessages: number;
  totalMedia: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [banner, setBanner] = useState<{ type: "info" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Overview state
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogItem[]>([]);

  // Blogs state
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogStatusFilter, setBlogStatusFilter] = useState<string>("");
  const [editingBlog, setEditingBlog] = useState<{
    id?: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
    featured: boolean;
    publishedAt: string;
    coverUrl: string;
    coverPublicId: string;
    coverAlt: string;
    seoTitle: string;
    seoDescription: string;
  } | null>(null);

  // Projects state
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [editingProject, setEditingProject] = useState<{
    id?: string;
    title: string;
    slug: string;
    summary: string;
    description: string;
    technologiesText: string;
    githubUrl: string;
    liveUrl: string;
    category: string;
    featured: boolean;
    status: "DRAFT" | "PUBLISHED";
    order: number;
    coverUrl: string;
    coverPublicId: string;
    coverAlt: string;
    seoTitle: string;
    seoDescription: string;
  } | null>(null);

  // Taxonomy state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"BLOG" | "PROJECT">("BLOG");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newTagName, setNewTagName] = useState("");

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserDetail, setSelectedUserDetail] = useState<{
    user: User;
    sessions: SessionInfo[];
    recentActivity: AuditLogItem[];
  } | null>(null);

  // Media state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaFolder, setMediaFolder] = useState<string>("dezaakir/general");
  const [mediaAlt, setMediaAlt] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<ContactMessageItem[]>([]);
  const [messageStatusFilter, setMessageStatusFilter] = useState<string>("");

  // Settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData>(DEFAULT_SITE_SETTINGS);
  const [skillsJson, setSkillsJson] = useState("");
  const [interestsText, setInterestsText] = useState("");

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>("");

  const notify = (text: string, type: "info" | "error" = "info") => {
    setBanner({ type, text });
  };

  const loadTaxonomy = useCallback(async () => {
    const [catRes, tagRes] = await Promise.all([
      apiRequest<{ categories: CategoryItem[] }>("/api/categories"),
      apiRequest<{ tags: TagItem[] }>("/api/tags"),
    ]);
    setCategories(catRes.data.categories ?? []);
    setTags(tagRes.data.tags ?? []);
  }, []);

  const loadTabContent = useCallback(
    async (tab: AdminTab) => {
      setLoading(true);
      try {
        if (tab === "overview") {
          const res = await apiRequest<{ stats: OverviewStats; recentActivity: AuditLogItem[] }>(
            "/api/admin/overview"
          );
          setStats(res.data.stats);
          setRecentActivity(res.data.recentActivity ?? []);
        } else if (tab === "blogs") {
          await loadTaxonomy();
          const qs = new URLSearchParams({ limit: "50" });
          if (blogSearch.trim()) qs.set("search", blogSearch.trim());
          if (blogStatusFilter) qs.set("status", blogStatusFilter);
          const res = await apiRequest<{ blogs: BlogArticle[] }>(
            `/api/admin/blogs?${qs.toString()}`
          );
          setBlogs(res.data.blogs ?? []);
        } else if (tab === "projects") {
          await loadTaxonomy();
          const qs = new URLSearchParams({ limit: "50" });
          if (projectSearch.trim()) qs.set("search", projectSearch.trim());
          const res = await apiRequest<{ projects: ProjectItem[] }>(
            `/api/admin/projects?${qs.toString()}`
          );
          setProjects(res.data.projects ?? []);
        } else if (tab === "taxonomy") {
          await loadTaxonomy();
        } else if (tab === "users") {
          const qs = new URLSearchParams({ limit: "50" });
          if (userSearch.trim()) qs.set("search", userSearch.trim());
          const res = await apiRequest<{ users: User[] }>(`/api/admin/users?${qs.toString()}`);
          setUsers(res.data.users ?? []);
        } else if (tab === "media") {
          const res = await apiRequest<{ media: MediaItem[] }>("/api/admin/media?limit=50");
          setMediaList(res.data.media ?? []);
        } else if (tab === "messages") {
          const qs = new URLSearchParams({ limit: "50" });
          if (messageStatusFilter) qs.set("status", messageStatusFilter);
          const res = await apiRequest<{ messages: ContactMessageItem[] }>(
            `/api/admin/messages?${qs.toString()}`
          );
          setMessages(res.data.messages ?? []);
        } else if (tab === "settings") {
          const res = await apiRequest<{ settings: SiteSettingsData }>("/api/settings");
          const merged = { ...DEFAULT_SITE_SETTINGS, ...(res.data.settings ?? {}) };
          setSiteSettings(merged);
          setSkillsJson(JSON.stringify(merged.skills ?? [], null, 2));
          setInterestsText((merged.careerInterests ?? []).join("\n"));
        } else if (tab === "audit") {
          const qs = new URLSearchParams({ limit: "50" });
          if (auditCategoryFilter) qs.set("category", auditCategoryFilter);
          const res = await apiRequest<{ logs: AuditLogItem[] }>(
            `/api/admin/audit-logs?${qs.toString()}`
          );
          setAuditLogs(res.data.logs ?? []);
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    },
    [
      blogSearch,
      blogStatusFilter,
      projectSearch,
      userSearch,
      messageStatusFilter,
      auditCategoryFilter,
      loadTaxonomy,
    ]
  );

  useEffect(() => {
    void loadTabContent(activeTab);
  }, [activeTab, loadTabContent]);

  // ── Blog handlers ──────────────────────────────────────────────────────────
  const openNewBlog = () => {
    setEditingBlog({
      title: "",
      slug: "",
      excerpt: "",
      content: "<h2>Introduction</h2><p>Write your technical article here...</p>",
      category: "",
      tags: [],
      status: "DRAFT",
      featured: false,
      publishedAt: "",
      coverUrl: "",
      coverPublicId: "",
      coverAlt: "",
      seoTitle: "",
      seoDescription: "",
    });
  };

  const openEditBlog = (blog: BlogArticle) => {
    const blogId = blog.id || (blog as unknown as { _id?: string })._id || "";
    setEditingBlog({
      id: blogId,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      category: blog.category?.id || (blog.category as unknown as { _id?: string })?._id || "",
      tags: (blog.tags ?? []).map((t) => t.id || (t as unknown as { _id?: string })._id || ""),
      status: blog.status,
      featured: blog.featured,
      publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString().slice(0, 16) : "",
      coverUrl: blog.coverImage?.url ?? "",
      coverPublicId: blog.coverImage?.publicId ?? "",
      coverAlt: blog.coverImage?.alt ?? "",
      seoTitle: blog.seoTitle ?? "",
      seoDescription: blog.seoDescription ?? "",
    });
  };

  const saveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlog) return;
    try {
      const payload: Record<string, unknown> = {
        title: editingBlog.title,
        ...(editingBlog.slug.trim() ? { slug: editingBlog.slug.trim() } : {}),
        excerpt: editingBlog.excerpt,
        content: editingBlog.content,
        category: editingBlog.category || null,
        tags: editingBlog.tags,
        status: editingBlog.status,
        featured: editingBlog.featured,
        ...(editingBlog.publishedAt
          ? { publishedAt: new Date(editingBlog.publishedAt).toISOString() }
          : {}),
        coverImage:
          editingBlog.coverUrl.trim() && editingBlog.coverPublicId.trim()
            ? {
                url: editingBlog.coverUrl.trim(),
                publicId: editingBlog.coverPublicId.trim(),
                alt: editingBlog.coverAlt.trim(),
              }
            : null,
        ...(editingBlog.seoTitle.trim() ? { seoTitle: editingBlog.seoTitle.trim() } : {}),
        ...(editingBlog.seoDescription.trim()
          ? { seoDescription: editingBlog.seoDescription.trim() }
          : {}),
      };

      if (editingBlog.id) {
        await apiRequest(`/api/blogs/${editingBlog.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        notify("Article updated.");
      } else {
        await apiRequest("/api/blogs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        notify("Article created.");
      }
      setEditingBlog(null);
      await loadTabContent("blogs");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save article", "error");
    }
  };

  const deleteBlogItem = async (id: string) => {
    if (!window.confirm("Delete this article permanently?")) return;
    try {
      await apiRequest(`/api/blogs/${id}`, { method: "DELETE" });
      notify("Article deleted.");
      await loadTabContent("blogs");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete article", "error");
    }
  };

  // ── Project handlers ───────────────────────────────────────────────────────
  const openNewProject = () => {
    setEditingProject({
      title: "",
      slug: "",
      summary: "",
      description: "<h2>Overview</h2><p>Describe the architecture and engineering impact...</p>",
      technologiesText: "TypeScript, Next.js, Bun, MongoDB",
      githubUrl: "",
      liveUrl: "",
      category: "",
      featured: false,
      status: "DRAFT",
      order: 0,
      coverUrl: "",
      coverPublicId: "",
      coverAlt: "",
      seoTitle: "",
      seoDescription: "",
    });
  };

  const openEditProject = (proj: ProjectItem) => {
    const projId = proj.id || (proj as unknown as { _id?: string })._id || "";
    setEditingProject({
      id: projId,
      title: proj.title,
      slug: proj.slug,
      summary: proj.summary,
      description: proj.description,
      technologiesText: (proj.technologies ?? []).join(", "),
      githubUrl: proj.githubUrl ?? "",
      liveUrl: proj.liveUrl ?? "",
      category: proj.category?.id || (proj.category as unknown as { _id?: string })?._id || "",
      featured: proj.featured,
      status: proj.status,
      order: proj.order ?? 0,
      coverUrl: proj.coverImage?.url ?? "",
      coverPublicId: proj.coverImage?.publicId ?? "",
      coverAlt: proj.coverImage?.alt ?? "",
      seoTitle: proj.seoTitle ?? "",
      seoDescription: proj.seoDescription ?? "",
    });
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      const technologies = editingProject.technologiesText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        title: editingProject.title,
        ...(editingProject.slug.trim() ? { slug: editingProject.slug.trim() } : {}),
        summary: editingProject.summary,
        description: editingProject.description,
        technologies,
        githubUrl: editingProject.githubUrl.trim(),
        liveUrl: editingProject.liveUrl.trim(),
        category: editingProject.category || null,
        featured: editingProject.featured,
        status: editingProject.status,
        order: Number(editingProject.order) || 0,
        coverImage:
          editingProject.coverUrl.trim() && editingProject.coverPublicId.trim()
            ? {
                url: editingProject.coverUrl.trim(),
                publicId: editingProject.coverPublicId.trim(),
                alt: editingProject.coverAlt.trim(),
              }
            : null,
        ...(editingProject.seoTitle.trim() ? { seoTitle: editingProject.seoTitle.trim() } : {}),
        ...(editingProject.seoDescription.trim()
          ? { seoDescription: editingProject.seoDescription.trim() }
          : {}),
      };

      if (editingProject.id) {
        await apiRequest(`/api/projects/${editingProject.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        notify("Project updated.");
      } else {
        await apiRequest("/api/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        notify("Project created.");
      }
      setEditingProject(null);
      await loadTabContent("projects");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save project", "error");
    }
  };

  const deleteProjectItem = async (id: string) => {
    if (!window.confirm("Delete this project permanently?")) return;
    try {
      await apiRequest(`/api/projects/${id}`, { method: "DELETE" });
      notify("Project deleted.");
      await loadTabContent("projects");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete project", "error");
    }
  };

  // ── Taxonomy handlers ──────────────────────────────────────────────────────
  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await apiRequest("/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newCategoryName.trim(),
          type: newCategoryType,
          description: newCategoryDesc.trim() || undefined,
        }),
      });
      setNewCategoryName("");
      setNewCategoryDesc("");
      notify("Category created.");
      await loadTaxonomy();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to create category", "error");
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await apiRequest(`/api/categories/${id}`, { method: "DELETE" });
      notify("Category deleted.");
      await loadTaxonomy();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete category", "error");
    }
  };

  const createTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await apiRequest("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      setNewTagName("");
      notify("Tag created.");
      await loadTaxonomy();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to create tag", "error");
    }
  };

  const removeTag = async (id: string) => {
    try {
      await apiRequest(`/api/tags/${id}`, { method: "DELETE" });
      notify("Tag deleted.");
      await loadTaxonomy();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete tag", "error");
    }
  };

  // ── User Management handlers ───────────────────────────────────────────────
  const inspectUser = async (id: string) => {
    try {
      const res = await apiRequest<{
        user: User;
        sessions: SessionInfo[];
        recentActivity: AuditLogItem[];
      }>(`/api/admin/users/${id}`);
      setSelectedUserDetail(res.data);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to load user details", "error");
    }
  };

  const changeUserStatus = async (
    id: string,
    payload: { status?: "ACTIVE" | "SUSPENDED" | "PENDING"; emailVerified?: boolean; revokeSessions?: boolean }
  ) => {
    try {
      await apiRequest(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      notify("User account updated.");
      await loadTabContent("users");
      if (selectedUserDetail && selectedUserDetail.user.id === id) {
        await inspectUser(id);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update user status", "error");
    }
  };

  const revokeAllUserSessions = async (id: string) => {
    try {
      const res = await apiRequest<{ revokedSessions: number }>(`/api/admin/users/${id}/sessions`, {
        method: "DELETE",
      });
      notify(`Revoked ${res.data.revokedSessions} active session(s).`);
      if (selectedUserDetail && selectedUserDetail.user.id === id) {
        await inspectUser(id);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to revoke sessions", "error");
    }
  };

  // ── Media Upload handlers ──────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? "");
          const commaIndex = result.indexOf(",");
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      await apiRequest("/api/admin/media/upload", {
        method: "POST",
        body: JSON.stringify({
          fileBase64: base64,
          claimedMimeType: file.type || "image/png",
          originalFilename: file.name,
          folder: mediaFolder,
          alt: mediaAlt.trim() || file.name,
        }),
      });
      setMediaAlt("");
      e.target.value = "";
      notify("Image verified by magic bytes and uploaded.");
      await loadTabContent("media");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Image upload rejected", "error");
    } finally {
      setUploadingMedia(false);
    }
  };

  const deleteMedia = async (id: string) => {
    try {
      await apiRequest(`/api/admin/media/${id}`, { method: "DELETE" });
      notify("Media asset deleted.");
      await loadTabContent("media");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Cannot delete media asset", "error");
    }
  };

  // ── Contact Messages handlers ──────────────────────────────────────────────
  const updateMessageStatus = async (id: string, status: "NEW" | "READ" | "ARCHIVED") => {
    try {
      await apiRequest(`/api/admin/messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      notify(`Message marked as ${status}.`);
      await loadTabContent("messages");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update message", "error");
    }
  };

  // ── Settings handler ───────────────────────────────────────────────────────
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedSkills = JSON.parse(skillsJson || "[]") as SiteSettingsData["skills"];
      const parsedInterests = interestsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const payload: Partial<SiteSettingsData> = {
        siteTitle: siteSettings.siteTitle,
        tagline: siteSettings.tagline,
        heroTitle: siteSettings.heroTitle,
        heroDescription: siteSettings.heroDescription,
        biography: siteSettings.biography,
        location: siteSettings.location,
        cvUrl: siteSettings.cvUrl,
        socialLinks: siteSettings.socialLinks,
        skills: parsedSkills,
        careerInterests: parsedInterests,
        seo: siteSettings.seo,
      };

      await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      notify("Site settings saved.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save settings", "error");
    }
  };

  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "blogs", label: "Blog Articles", icon: FileText },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "taxonomy", label: "Categories & Tags", icon: Tags },
    { id: "users", label: "Users", icon: Users },
    { id: "media", label: "Media Library", icon: ImageIcon },
    { id: "messages", label: "Contact Messages", icon: Mail },
    { id: "settings", label: "Website Settings", icon: Settings },
    { id: "audit", label: "Audit Logs", icon: ShieldAlert },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/15 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 border border-white/25 bg-white/5 px-2.5 py-1 font-mono text-xs uppercase tracking-widest text-white/80">
            <Lock className="h-3 w-3" /> Administrator · MFA Verified
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dezaakir Control Center
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void loadTabContent(activeTab)}
          className="inline-flex items-center gap-2 border border-white/25 bg-navy px-4 py-2 text-xs font-medium uppercase tracking-wider text-white transition hover:border-white hover:bg-white hover:text-navy"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {banner && (
        <div
          className={`mb-6 flex items-center justify-between border px-4 py-3 text-sm ${
            banner.type === "error"
              ? "border-white bg-white/10 text-white"
              : "border-white/30 bg-white/5 text-white"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-4 text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3">
          <nav className="flex flex-col space-y-1 border border-white/15 bg-white/[0.02] p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-navy font-semibold"
                      : "text-white/75 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <section className="lg:col-span-9">
          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Total Articles", value: stats?.totalBlogs ?? 0 },
                  { label: "Published Articles", value: stats?.publishedBlogs ?? 0 },
                  { label: "Draft Articles", value: stats?.draftBlogs ?? 0 },
                  { label: "Total Projects", value: stats?.totalProjects ?? 0 },
                  { label: "Registered Users", value: stats?.totalUsers ?? 0 },
                  { label: "Unverified Users", value: stats?.unverifiedUsers ?? 0 },
                  { label: "Contact Messages", value: stats?.totalMessages ?? 0 },
                  { label: "Unread Messages", value: stats?.unreadMessages ?? 0 },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="border border-white/15 bg-white/[0.02] p-4"
                  >
                    <p className="font-mono text-xs uppercase tracking-wider text-white/60">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="border border-white/15 bg-white/[0.02] p-6">
                <h2 className="text-base font-semibold uppercase tracking-wider text-white">
                  Recent Administrative & Security Activity
                </h2>
                <div className="mt-4 divide-y divide-white/10">
                  {recentActivity.length === 0 ? (
                    <p className="py-4 text-sm text-white/60">No audit events recorded yet.</p>
                  ) : (
                    recentActivity.map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-col justify-between gap-2 py-3 text-xs sm:flex-row sm:items-center"
                      >
                        <div className="space-y-0.5">
                          <span className="inline-block border border-white/25 px-1.5 py-0.5 font-mono text-[10px] uppercase text-white/80">
                            {log.category} · {log.outcome}
                          </span>
                          <p className="font-mono text-white">
                            {log.action}{" "}
                            {log.targetType ? `→ ${log.targetType} (${log.targetId ?? ""})` : ""}
                          </p>
                        </div>
                        <span className="font-mono text-white/60">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. BLOG MANAGEMENT TAB */}
          {activeTab === "blogs" && (
            <div className="space-y-6">
              {!editingBlog ? (
                <>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/50" />
                        <input
                          type="text"
                          value={blogSearch}
                          onChange={(e) => setBlogSearch(e.target.value)}
                          placeholder="Search articles..."
                          className="w-full border border-white/20 bg-navy py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                        />
                      </div>
                      <select
                        value={blogStatusFilter}
                        onChange={(e) => setBlogStatusFilter(e.target.value)}
                        className="border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      >
                        <option value="">All Statuses</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SCHEDULED">Scheduled</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={openNewBlog}
                      className="inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-navy transition hover:bg-white/90"
                    >
                      <Plus className="h-4 w-4" /> New Article
                    </button>
                  </div>

                  <div className="divide-y divide-white/10 border border-white/15 bg-white/[0.02]">
                    {blogs.length === 0 ? (
                      <p className="p-6 text-sm text-white/60">No articles found.</p>
                    ) : (
                      blogs.map((blog) => {
                        const blogId =
                          blog.id || (blog as unknown as { _id?: string })._id || "";
                        return (
                          <div
                            key={blogId}
                            className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="border border-white/30 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
                                  {blog.status}
                                </span>
                                {blog.featured && (
                                  <span className="bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-navy">
                                    Featured
                                  </span>
                                )}
                                <span className="font-mono text-xs text-white/60">
                                  /{blog.slug} · {blog.readingTime} min read
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-white">{blog.title}</h3>
                              <p className="line-clamp-1 text-xs text-white/70">{blog.excerpt}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditBlog(blog)}
                                className="inline-flex items-center gap-1 border border-white/25 px-3 py-1.5 text-xs text-white hover:border-white"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteBlogItem(blogId)}
                                className="inline-flex items-center gap-1 border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:border-white hover:text-white"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <form
                  onSubmit={(e) => void saveBlog(e)}
                  className="space-y-5 border border-white/15 bg-white/[0.02] p-6"
                >
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <h2 className="text-lg font-semibold text-white">
                      {editingBlog.id ? "Edit Article" : "Create Article"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingBlog(null)}
                      className="border border-white/25 px-3 py-1 text-xs text-white hover:border-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingBlog.title}
                        onChange={(e) =>
                          setEditingBlog({ ...editingBlog, title: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Slug (optional — auto-generated if empty)
                      </label>
                      <input
                        type="text"
                        value={editingBlog.slug}
                        onChange={(e) =>
                          setEditingBlog({ ...editingBlog, slug: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-white/70">
                      Excerpt / Summary *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={editingBlog.excerpt}
                      onChange={(e) =>
                        setEditingBlog({ ...editingBlog, excerpt: e.target.value })
                      }
                      className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-mono uppercase text-white/70">
                      Article Body (TipTap Rich Text — Sanitized on Save) *
                    </label>
                    <RichTextEditor
                      value={editingBlog.content}
                      onChange={(html) => setEditingBlog({ ...editingBlog, content: html })}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Status
                      </label>
                      <select
                        value={editingBlog.status}
                        onChange={(e) =>
                          setEditingBlog({
                            ...editingBlog,
                            status: e.target.value as "DRAFT" | "SCHEDULED" | "PUBLISHED",
                          })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                        <option value="SCHEDULED">SCHEDULED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Category
                      </label>
                      <select
                        value={editingBlog.category}
                        onChange={(e) =>
                          setEditingBlog({ ...editingBlog, category: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      >
                        <option value="">None</option>
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
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Publish Date (Required if SCHEDULED)
                      </label>
                      <input
                        type="datetime-local"
                        value={editingBlog.publishedAt}
                        onChange={(e) =>
                          setEditingBlog({ ...editingBlog, publishedAt: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="blog-featured"
                      type="checkbox"
                      checked={editingBlog.featured}
                      onChange={(e) =>
                        setEditingBlog({ ...editingBlog, featured: e.target.checked })
                      }
                      className="h-4 w-4 accent-white"
                    />
                    <label htmlFor="blog-featured" className="text-sm text-white">
                      Feature this article on the homepage & blog header
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/15 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingBlog(null)}
                      className="border border-white/25 px-4 py-2 text-xs uppercase tracking-wider text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-white px-6 py-2 text-xs font-semibold uppercase tracking-wider text-navy hover:bg-white/90"
                    >
                      Save Article
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 3. PROJECT MANAGEMENT TAB */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              {!editingProject ? (
                <>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/50" />
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full border border-white/20 bg-navy py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openNewProject}
                      className="inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-navy transition hover:bg-white/90"
                    >
                      <Plus className="h-4 w-4" /> New Project
                    </button>
                  </div>

                  <div className="divide-y divide-white/10 border border-white/15 bg-white/[0.02]">
                    {projects.length === 0 ? (
                      <p className="p-6 text-sm text-white/60">No projects found.</p>
                    ) : (
                      projects.map((proj) => {
                        const projId =
                          proj.id || (proj as unknown as { _id?: string })._id || "";
                        return (
                          <div
                            key={projId}
                            className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="border border-white/30 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
                                  {proj.status}
                                </span>
                                {proj.featured && (
                                  <span className="bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-navy">
                                    Featured
                                  </span>
                                )}
                                <span className="font-mono text-xs text-white/60">
                                  /{proj.slug}
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-white">{proj.title}</h3>
                              <p className="line-clamp-1 text-xs text-white/70">{proj.summary}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditProject(proj)}
                                className="inline-flex items-center gap-1 border border-white/25 px-3 py-1.5 text-xs text-white hover:border-white"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteProjectItem(projId)}
                                className="inline-flex items-center gap-1 border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:border-white hover:text-white"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <form
                  onSubmit={(e) => void saveProject(e)}
                  className="space-y-5 border border-white/15 bg-white/[0.02] p-6"
                >
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <h2 className="text-lg font-semibold text-white">
                      {editingProject.id ? "Edit Project" : "Create Project"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="border border-white/25 px-3 py-1 text-xs text-white hover:border-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Project Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProject.title}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, title: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Slug (optional)
                      </label>
                      <input
                        type="text"
                        value={editingProject.slug}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, slug: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-white/70">
                      Card Summary *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={editingProject.summary}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, summary: e.target.value })
                      }
                      className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-mono uppercase text-white/70">
                      Detailed Project Case Study (Rich Text) *
                    </label>
                    <RichTextEditor
                      value={editingProject.description}
                      onChange={(html) =>
                        setEditingProject({ ...editingProject, description: html })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Technologies (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editingProject.technologiesText}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            technologiesText: e.target.value,
                          })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        GitHub Repository URL (https://github.com/...)
                      </label>
                      <input
                        type="url"
                        value={editingProject.githubUrl}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, githubUrl: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Live Demo URL (https://...)
                      </label>
                      <input
                        type="url"
                        value={editingProject.liveUrl}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, liveUrl: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Status
                      </label>
                      <select
                        value={editingProject.status}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            status: e.target.value as "DRAFT" | "PUBLISHED",
                          })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Category
                      </label>
                      <select
                        value={editingProject.category}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, category: e.target.value })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      >
                        <option value="">None</option>
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
                      <label className="block text-xs font-mono uppercase text-white/70">
                        Display Order
                      </label>
                      <input
                        type="number"
                        value={editingProject.order}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            order: Number(e.target.value) || 0,
                          })
                        }
                        className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="project-featured"
                      type="checkbox"
                      checked={editingProject.featured}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, featured: e.target.checked })
                      }
                      className="h-4 w-4 accent-white"
                    />
                    <label htmlFor="project-featured" className="text-sm text-white">
                      Feature this project on the homepage
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/15 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="border border-white/25 px-4 py-2 text-xs uppercase tracking-wider text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-white px-6 py-2 text-xs font-semibold uppercase tracking-wider text-navy hover:bg-white/90"
                    >
                      Save Project
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 4. CATEGORIES & TAGS TAB */}
          {activeTab === "taxonomy" && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-4 border border-white/15 bg-white/[0.02] p-6">
                <h2 className="text-base font-semibold uppercase tracking-wider text-white">
                  Categories
                </h2>
                <form onSubmit={(e) => void createCategory(e)} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name..."
                      className="flex-1 border border-white/20 bg-navy px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                    />
                    <select
                      value={newCategoryType}
                      onChange={(e) => setNewCategoryType(e.target.value as "BLOG" | "PROJECT")}
                      className="border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                    >
                      <option value="BLOG">BLOG</option>
                      <option value="PROJECT">PROJECT</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-white py-2 text-xs font-semibold uppercase tracking-wider text-navy hover:bg-white/90"
                  >
                    Add Category
                  </button>
                </form>

                <div className="divide-y divide-white/10 pt-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <span className="mr-2 border border-white/25 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                          {cat.type}
                        </span>
                        <span className="font-medium text-white">{cat.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeCategory(cat.id)}
                        className="text-white/60 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border border-white/15 bg-white/[0.02] p-6">
                <h2 className="text-base font-semibold uppercase tracking-wider text-white">
                  Blog Tags
                </h2>
                <form onSubmit={(e) => void createTag(e)} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name..."
                    className="flex-1 border border-white/20 bg-navy px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-navy hover:bg-white/90"
                  >
                    Add Tag
                  </button>
                </form>

                <div className="divide-y divide-white/10 pt-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-mono text-white">#{tag.slug}</span>
                      <button
                        type="button"
                        onClick={() => void removeTag(tag.id)}
                        className="text-white/60 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. USER MANAGEMENT TAB */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/50" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search registered users by name or email..."
                  className="w-full border border-white/20 bg-navy py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                />
              </div>

              <div className="divide-y divide-white/10 border border-white/15 bg-white/[0.02]">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-navy">
                          {u.role}
                        </span>
                        <span className="border border-white/30 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
                          {u.status}
                        </span>
                        <span className="font-mono text-xs text-white/70">
                          {u.emailVerified ? "Verified Email" : "Unverified Email"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {u.name} <span className="font-mono text-xs text-white/70">({u.email})</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void inspectUser(u.id)}
                        className="border border-white/25 px-3 py-1.5 text-xs text-white hover:border-white"
                      >
                        Inspect
                      </button>
                      {!u.emailVerified && (
                        <button
                          type="button"
                          onClick={() =>
                            void changeUserStatus(u.id, { emailVerified: true, status: "ACTIVE" })
                          }
                          className="border border-white/25 px-3 py-1.5 text-xs text-white hover:border-white"
                        >
                          Verify
                        </button>
                      )}
                      {u.role !== "ADMIN" &&
                        (u.status === "SUSPENDED" ? (
                          <button
                            type="button"
                            onClick={() => void changeUserStatus(u.id, { status: "ACTIVE" })}
                            className="bg-white px-3 py-1.5 text-xs font-semibold text-navy"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void changeUserStatus(u.id, {
                                status: "SUSPENDED",
                                revokeSessions: true,
                              })
                            }
                            className="border border-white/40 px-3 py-1.5 text-xs text-white hover:bg-white hover:text-navy"
                          >
                            Suspend
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => void revokeAllUserSessions(u.id)}
                        className="border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:border-white hover:text-white"
                      >
                        Revoke Sessions
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedUserDetail && (
                <div className="border border-white/30 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between border-b border-white/15 pb-3">
                    <h3 className="text-base font-semibold text-white">
                      User Security Inspector: {selectedUserDetail.user.email}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedUserDetail(null)}
                      className="text-white/70 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-4 text-xs">
                    <p className="font-mono text-white/80">
                      Active Sessions ({selectedUserDetail.sessions.length}) — Passwords & OTP
                      hashes are never exposed to administrators.
                    </p>
                    <div className="divide-y divide-white/10 border border-white/15">
                      {selectedUserDetail.sessions.length === 0 ? (
                        <p className="p-3 text-white/60">No active sessions.</p>
                      ) : (
                        selectedUserDetail.sessions.map((s) => (
                          <div key={s.id} className="flex justify-between p-3 font-mono">
                            <span>
                              IP: {s.ip ?? "unknown"} · {s.userAgent ?? "Browser"}
                            </span>
                            <span>
                              Expires: {new Date(s.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. MEDIA MANAGEMENT TAB */}
          {activeTab === "media" && (
            <div className="space-y-6">
              <div className="border border-white/15 bg-white/[0.02] p-6">
                <h2 className="text-base font-semibold uppercase tracking-wider text-white">
                  Upload Verified Image (PNG, JPEG, WebP, GIF, AVIF · Max 5MB)
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  Files are verified by magic-byte binary signatures on the server. SVG, scripts,
                  and polyglot payloads are strictly rejected.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select
                    value={mediaFolder}
                    onChange={(e) => setMediaFolder(e.target.value)}
                    className="border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  >
                    <option value="dezaakir/general">dezaakir/general</option>
                    <option value="dezaakir/blogs">dezaakir/blogs</option>
                    <option value="dezaakir/projects">dezaakir/projects</option>
                    <option value="dezaakir/profile">dezaakir/profile</option>
                  </select>
                  <input
                    type="text"
                    value={mediaAlt}
                    onChange={(e) => setMediaAlt(e.target.value)}
                    placeholder="Accessible alt text..."
                    className="border border-white/20 bg-navy px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                  />
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-navy hover:bg-white/90">
                    <Upload className="h-4 w-4" />
                    <span>{uploadingMedia ? "Verifying & Uploading..." : "Select Image File"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      onChange={(e) => void handleFileUpload(e)}
                      disabled={uploadingMedia}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mediaList.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between border border-white/15 bg-white/[0.02] p-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase text-white/70">
                        <span>{item.format}</span>
                        <span>{(item.bytes / 1024).toFixed(1)} KB</span>
                      </div>
                      <p className="truncate font-mono text-xs text-white" title={item.publicId}>
                        {item.publicId}
                      </p>
                      <p className="truncate text-xs text-white/60">{item.alt || "No alt text"}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(item.url);
                          notify("Copied image URL to clipboard.");
                        }}
                        className="inline-flex items-center gap-1 border border-white/25 px-2.5 py-1 text-xs text-white hover:border-white"
                      >
                        <ExternalLink className="h-3 w-3" /> Copy URL
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteMedia(item.id)}
                        className="inline-flex items-center gap-1 border border-white/25 px-2.5 py-1 text-xs text-white/75 hover:border-white hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. CONTACT MESSAGES TAB */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <select
                  value={messageStatusFilter}
                  onChange={(e) => setMessageStatusFilter(e.target.value)}
                  className="border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                >
                  <option value="">All Messages</option>
                  <option value="NEW">NEW</option>
                  <option value="READ">READ</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="divide-y divide-white/10 border border-white/15 bg-white/[0.02]">
                {messages.length === 0 ? (
                  <p className="p-6 text-sm text-white/60">No contact messages found.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="border border-white/30 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
                            {msg.status}
                          </span>
                          <h3 className="text-sm font-semibold text-white">{msg.subject}</h3>
                        </div>
                        <span className="font-mono text-xs text-white/60">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-white/80">
                        From: {msg.name} &lt;{msg.email}&gt;
                      </p>
                      <p className="whitespace-pre-line text-sm text-white/90">{msg.message}</p>
                      <div className="flex gap-2 pt-2">
                        {msg.status !== "READ" && (
                          <button
                            type="button"
                            onClick={() => void updateMessageStatus(msg.id, "READ")}
                            className="inline-flex items-center gap-1 border border-white/25 px-3 py-1 text-xs text-white hover:border-white"
                          >
                            <Check className="h-3.5 w-3.5" /> Mark Read
                          </button>
                        )}
                        {msg.status !== "ARCHIVED" && (
                          <button
                            type="button"
                            onClick={() => void updateMessageStatus(msg.id, "ARCHIVED")}
                            className="inline-flex items-center gap-1 border border-white/25 px-3 py-1 text-xs text-white/75 hover:border-white hover:text-white"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 8. WEBSITE SETTINGS TAB */}
          {activeTab === "settings" && (
            <form
              onSubmit={(e) => void saveSettings(e)}
              className="space-y-5 border border-white/15 bg-white/[0.02] p-6"
            >
              <h2 className="text-base font-semibold uppercase tracking-wider text-white">
                Website Profile, Biography & SEO Settings
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/70">
                    Site Title
                  </label>
                  <input
                    type="text"
                    value={siteSettings.siteTitle}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, siteTitle: e.target.value })
                    }
                    className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-white/70">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={siteSettings.tagline}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, tagline: e.target.value })
                    }
                    className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/70">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={siteSettings.heroTitle}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, heroTitle: e.target.value })
                  }
                  className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/70">
                  Hero Introduction
                </label>
                <textarea
                  rows={2}
                  value={siteSettings.heroDescription}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, heroDescription: e.target.value })
                  }
                  className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/70">
                  Full Biography
                </label>
                <textarea
                  rows={5}
                  value={siteSettings.biography}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, biography: e.target.value })
                  }
                  className="mt-1 w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/70">
                    Skills (JSON Array)
                  </label>
                  <textarea
                    rows={6}
                    value={skillsJson}
                    onChange={(e) => setSkillsJson(e.target.value)}
                    className="mt-1 w-full border border-white/20 bg-navy p-3 font-mono text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-white/70">
                    Career Interests (One per line)
                  </label>
                  <textarea
                    rows={6}
                    value={interestsText}
                    onChange={(e) => setInterestsText(e.target.value)}
                    className="mt-1 w-full border border-white/20 bg-navy p-3 font-mono text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-white/15 pt-4">
                <button
                  type="submit"
                  className="bg-white px-6 py-2 text-xs font-semibold uppercase tracking-wider text-navy hover:bg-white/90"
                >
                  Save Website Settings
                </button>
              </div>
            </form>
          )}

          {/* 9. AUDIT LOGS TAB */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <select
                  value={auditCategoryFilter}
                  onChange={(e) => setAuditCategoryFilter(e.target.value)}
                  className="border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="AUTH">AUTH</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SECURITY">SECURITY</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
              </div>

              <div className="divide-y divide-white/10 border border-white/15 bg-white/[0.02]">
                {auditLogs.length === 0 ? (
                  <p className="p-6 text-sm text-white/60">No audit logs found.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col justify-between gap-2 p-4 text-xs sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="border border-white/30 px-1.5 py-0.5 font-mono text-[10px] uppercase text-white">
                            {log.category}
                          </span>
                          <span className="font-mono text-[10px] uppercase text-white/70">
                            {log.outcome}
                          </span>
                          <span className="font-mono font-semibold text-white">{log.action}</span>
                        </div>
                        <p className="font-mono text-white/70">
                          Actor: {log.actorEmail ?? "system/anonymous"} · IP: {log.ip ?? "n/a"}
                          {log.targetType ? ` · Target: ${log.targetType} (${log.targetId ?? ""})` : ""}
                        </p>
                      </div>
                      <span className="font-mono text-white/60">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
