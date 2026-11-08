"use client";

import { useState } from "react";
import {
  Archive,
  Check,
  Copy,
  Edit3,
  Eye,
  Folder,
  Grid,
  Image as ImageIcon,
  List,
  Lock,
  Mail,
  MailOpen,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  EmptyState,
  PaginationBar,
  TableSkeleton,
} from "@/features/admin/AdminUI";
import type {
  AuditLogItem,
  CategoryItem,
  ContactMessageItem,
  MediaItem,
  PaginationMeta,
  SessionInfo,
  TagItem,
  User,
} from "@/types";

export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function AdminCategoriesView({
  categories,
  onSaveCategory,
  onDeleteCategory,
}: {
  categories: CategoryItem[];
  onSaveCategory: (
    payload: { name: string; slug: string; type: "BLOG" | "PROJECT"; description?: string },
    editingId?: string
  ) => Promise<void>;
  onDeleteCategory: (cat: CategoryItem) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"BLOG" | "PROJECT">("BLOG");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "BLOG" | "PROJECT">("");
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setType("BLOG");
    setDescription("");
  };

  const startEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setType(cat.type);
    setDescription(cat.description || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSaveCategory(
        {
          name: name.trim(),
          slug: slug.trim() || slugifyText(name),
          type,
          description: description.trim() || undefined,
        },
        editingId || undefined
      );
      resetForm();
    } finally {
      setBusy(false);
    }
  };

  const filtered = categories.filter((c) => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border border-white/15 bg-white/[0.02] p-5 lg:col-span-1"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            {editingId ? "Edit Category" : "New Category"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="font-mono text-[10px] text-white/70 uppercase hover:text-white"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
            Category Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editingId) setSlug(slugifyText(e.target.value));
            }}
            placeholder="e.g. Artificial Intelligence"
            className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
            URL Slug
          </label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(slugifyText(e.target.value))}
            placeholder="artificial-intelligence"
            className="w-full border border-white/25 bg-navy px-3 py-2 font-mono text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
            Content Scope
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "BLOG" | "PROJECT")}
            className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
          >
            <option value="BLOG">BLOG (Articles)</option>
            <option value="PROJECT">PROJECT (Portfolio)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this category..."
            className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-white py-2.5 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90 disabled:opacity-50"
        >
          {busy ? "Saving..." : editingId ? "Update Category" : "Create Category"}
        </button>
      </form>

      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories by name or slug..."
              className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | "BLOG" | "PROJECT")}
            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
          >
            <option value="">All Scopes ({categories.length})</option>
            <option value="BLOG">BLOG Categories</option>
            <option value="PROJECT">PROJECT Categories</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No categories found"
            description="Create a BLOG or PROJECT category using the form on the left."
          />
        ) : (
          <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Usage Count</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((cat) => (
                  <tr key={cat.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{cat.name}</p>
                      {cat.description && (
                        <p className="mt-0.5 text-[11px] text-white/55">{cat.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/70">/{cat.slug}</td>
                    <td className="px-4 py-3">
                      <span className="border border-white/25 px-2 py-0.5 font-mono text-[10px] text-white">
                        {cat.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                        {cat.usageCount ?? 0} {cat.type === "BLOG" ? "posts" : "projects"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCategory(cat)}
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
      </div>
    </div>
  );
}

export function AdminTagsView({
  tags,
  onSaveTag,
  onDeleteTag,
}: {
  tags: TagItem[];
  onSaveTag: (payload: { name: string; slug: string }, editingId?: string) => Promise<void>;
  onDeleteTag: (tag: TagItem) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSlug("");
  };

  const startEdit = (t: TagItem) => {
    setEditingId(t.id);
    setName(t.name);
    setSlug(t.slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSaveTag(
        {
          name: name.trim(),
          slug: slug.trim() || slugifyText(name),
        },
        editingId || undefined
      );
      resetForm();
    } finally {
      setBusy(false);
    }
  };

  const filtered = tags.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border border-white/15 bg-white/[0.02] p-5 lg:col-span-1"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            {editingId ? "Edit Tag" : "Create Tag"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="font-mono text-[10px] text-white/70 uppercase hover:text-white"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
            Tag Label
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editingId) setSlug(slugifyText(e.target.value));
            }}
            placeholder="e.g. Next.js"
            className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
            URL Slug
          </label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(slugifyText(e.target.value))}
            placeholder="nextjs"
            className="w-full border border-white/25 bg-navy px-3 py-2 font-mono text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-white py-2.5 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90 disabled:opacity-50"
        >
          {busy ? "Saving..." : editingId ? "Update Tag" : "Create Tag"}
        </button>
      </form>

      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags by name or slug..."
              className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
            />
          </div>
          <span className="font-mono text-xs text-white/65">{filtered.length} tags</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No tags found"
            description="Create article tags to organize technical blog topics."
          />
        ) : (
          <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
                <tr>
                  <th className="px-4 py-3">Tag Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Article Usage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((tag) => (
                  <tr key={tag.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-semibold text-white">#{tag.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/70">{tag.slug}</td>
                    <td className="px-4 py-3">
                      <span className="bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                        {tag.usageCount ?? 0} articles
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(tag)}
                          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTag(tag)}
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
      </div>
    </div>
  );
}

export function AdminMediaLibraryView({
  media,
  loading,
  uploading,
  search,
  setSearch,
  folderFilter,
  setFolderFilter,
  uploadFolder,
  setUploadFolder,
  uploadAlt,
  setUploadAlt,
  onSearch,
  onUploadFile,
  onCopyUrl,
  onDeleteMedia,
}: {
  media: MediaItem[];
  loading: boolean;
  uploading: boolean;
  search: string;
  setSearch: (v: string) => void;
  folderFilter: string;
  setFolderFilter: (v: string) => void;
  uploadFolder: "blogs" | "projects" | "profile" | "general";
  setUploadFolder: (v: "blogs" | "projects" | "profile" | "general") => void;
  uploadAlt: string;
  setUploadAlt: (v: string) => void;
  onSearch: () => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCopyUrl: (url: string) => void;
  onDeleteMedia: (item: MediaItem) => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAsset, setSelectedAsset] = useState<MediaItem | null>(null);

  return (
    <div className="space-y-6">
      <div className="border border-white/15 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Upload Media Asset (Server Magic-Byte Verified)
            </h3>
            <p className="mt-0.5 text-xs text-white/60">
              Supports PNG, JPEG, WebP, and GIF up to 5MB. Synced with Cloudinary Media CDN.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase ${
                viewMode === "grid"
                  ? "bg-white text-navy"
                  : "border border-white/20 text-white/75 hover:border-white"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase ${
                viewMode === "list"
                  ? "bg-white text-navy"
                  : "border border-white/20 text-white/75 hover:border-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
              Folder
            </label>
            <select
              value={uploadFolder}
              onChange={(e) =>
                setUploadFolder(e.target.value as "blogs" | "projects" | "profile" | "general")
              }
              className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
            >
              <option value="blogs">blogs</option>
              <option value="projects">projects</option>
              <option value="profile">profile</option>
              <option value="general">general</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/70">
              Alt Description
            </label>
            <input
              type="text"
              value={uploadAlt}
              onChange={(e) => setUploadAlt(e.target.value)}
              placeholder="Descriptive alt text for accessibility & SEO..."
              className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? "Uploading..." : "Select & Upload"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onUploadFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search media by publicId, filename, or alt text..."
            className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>
        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
        >
          <option value="">All Folders</option>
          <option value="blogs">blogs</option>
          <option value="projects">projects</option>
          <option value="profile">profile</option>
          <option value="general">general</option>
        </select>
        <button
          type="button"
          onClick={onSearch}
          className="border border-white/25 px-4 py-2 text-xs font-semibold text-white uppercase hover:border-white"
        >
          Filter
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : media.length === 0 ? (
        <EmptyState
          title="Media Library is empty"
          description="Upload images above to manage blog covers, project screenshots, and profile assets."
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between border border-white/15 bg-white/[0.02] transition hover:border-white/40"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(item)}
                  className="group relative block aspect-video w-full overflow-hidden border-b border-white/10 bg-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.alt || item.publicId}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute top-2 left-2 bg-navy/90 px-2 py-0.5 font-mono text-[10px] text-white uppercase">
                    {item.folder}
                  </span>
                  <span className="absolute right-2 bottom-2 bg-navy/90 px-2 py-0.5 font-mono text-[10px] text-white uppercase">
                    {item.format}
                  </span>
                </button>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-white" title={item.publicId}>
                    {item.alt || item.publicId}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-white/55">
                    {item.publicId}
                  </p>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-white/60">
                    <span>{(item.bytes / 1024).toFixed(1)} KB</span>
                    <span>
                      {item.width && item.height ? `${item.width}×${item.height}` : "Image"}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onCopyUrl(item.url)}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-white/80 uppercase hover:text-white"
                >
                  <Copy className="h-3 w-3" />
                  Copy URL
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(item)}
                    className="font-mono text-[10px] text-white/75 uppercase hover:text-white"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMedia(item)}
                    className="font-mono text-[10px] text-white/75 uppercase hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
              <tr>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">File / Public ID</th>
                <th className="px-4 py-3">Folder</th>
                <th className="px-4 py-3">Type & Dimensions</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {media.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedAsset(item)}
                      className="h-10 w-16 overflow-hidden border border-white/20 bg-white/5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.alt || item.publicId}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-white">{item.alt || item.publicId}</p>
                    <p className="font-mono text-[10px] text-white/55">{item.publicId}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white/75">
                    {item.folder}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white/75 uppercase">
                    {item.format}{" "}
                    {item.width && item.height ? `(${item.width}×${item.height})` : ""}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white/75">
                    {(item.bytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white/60">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onCopyUrl(item.url)}
                        className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                      >
                        Copy URL
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMedia(item)}
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

      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl border border-white/30 bg-navy p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Media Asset Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="border border-white/20 p-1 text-white/70 hover:border-white hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div className="overflow-hidden border border-white/20 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.alt || selectedAsset.publicId}
                  className="max-h-72 w-full object-contain"
                />
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="font-mono text-[10px] uppercase text-white/55">Public ID</span>
                  <p className="break-all font-mono text-white">{selectedAsset.publicId}</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase text-white/55">Alt Text</span>
                  <p className="text-white">{selectedAsset.alt || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div>
                    <span className="text-[10px] uppercase text-white/55">Format:</span>{" "}
                    <span className="uppercase">{selectedAsset.format}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-white/55">Size:</span>{" "}
                    {(selectedAsset.bytes / 1024).toFixed(1)} KB
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-white/55">Dimensions:</span>{" "}
                    {selectedAsset.width && selectedAsset.height
                      ? `${selectedAsset.width}×${selectedAsset.height}px`
                      : "N/A"}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-white/55">Folder:</span>{" "}
                    {selectedAsset.folder}
                  </div>
                </div>
                <div className="pt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onCopyUrl(selectedAsset.url)}
                    className="bg-white px-4 py-2 text-xs font-bold text-navy uppercase"
                  >
                    Copy Asset URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedAsset;
                      setSelectedAsset(null);
                      onDeleteMedia(target);
                    }}
                    className="border border-white/25 px-4 py-2 text-xs font-semibold text-white uppercase hover:border-white"
                  >
                    Delete Asset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminMessagesView({
  messages,
  loading,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  onSearch,
  onUpdateStatus,
  onDeleteMessage,
}: {
  messages: ContactMessageItem[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onSearch: () => void;
  onUpdateStatus: (id: string, status: "NEW" | "READ" | "ARCHIVED") => Promise<void>;
  onDeleteMessage: (msg: ContactMessageItem) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMessage =
    messages.find((m) => m.id === selectedId) || messages[0] || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search inquiries by sender name, email, or subject..."
            className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["", "All Messages"],
              ["NEW", "Unread (NEW)"],
              ["READ", "Read"],
              ["ARCHIVED", "Archived"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-2 text-xs font-semibold uppercase transition ${
                statusFilter === val
                  ? "bg-white text-navy"
                  : "border border-white/20 text-white/75 hover:border-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSearch}
          className="border border-white/25 px-4 py-2 text-xs font-semibold text-white uppercase hover:border-white"
        >
          Search
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : messages.length === 0 ? (
        <EmptyState
          title="No contact messages found"
          description="Incoming inquiries submitted through the public Contact form will appear here."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-5">
            {messages.map((msg) => {
              const active = selectedMessage?.id === msg.id;
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => setSelectedId(msg.id)}
                  className={`w-full border p-4 text-left transition ${
                    active
                      ? "border-white bg-white/[0.06]"
                      : "border-white/15 bg-white/[0.02] hover:border-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        msg.status === "NEW"
                          ? "bg-white text-navy"
                          : "border border-white/25 text-white/75"
                      }`}
                    >
                      {msg.status === "NEW" ? "UNREAD" : msg.status}
                    </span>
                    <span className="font-mono text-[10px] text-white/55">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-white">{msg.subject}</p>
                  <p className="mt-0.5 truncate text-xs text-white/70">
                    {msg.name} · <span className="font-mono">{msg.email}</span>
                  </p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            {selectedMessage && (
              <div className="border border-white/20 bg-white/[0.02] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          selectedMessage.status === "NEW"
                            ? "bg-white text-navy"
                            : "border border-white/25 text-white/80"
                        }`}
                      >
                        {selectedMessage.status}
                      </span>
                      <span className="font-mono text-xs text-white/60">
                        Received {new Date(selectedMessage.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-white">
                      {selectedMessage.subject}
                    </h3>
                    <p className="mt-1 text-xs text-white/80">
                      From: <strong>{selectedMessage.name}</strong> (
                      <a
                        href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                        className="font-mono underline"
                      >
                        {selectedMessage.email}
                      </a>
                      )
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedMessage.status !== "READ" && (
                      <button
                        type="button"
                        onClick={() => void onUpdateStatus(selectedMessage.id, "READ")}
                        className="bg-white px-3 py-1.5 font-mono text-[10px] font-bold text-navy uppercase"
                      >
                        Mark Read
                      </button>
                    )}
                    {selectedMessage.status !== "NEW" && (
                      <button
                        type="button"
                        onClick={() => void onUpdateStatus(selectedMessage.id, "NEW")}
                        className="border border-white/25 px-3 py-1.5 font-mono text-[10px] text-white uppercase hover:border-white"
                      >
                        Mark Unread
                      </button>
                    )}
                    {selectedMessage.status !== "ARCHIVED" && (
                      <button
                        type="button"
                        onClick={() => void onUpdateStatus(selectedMessage.id, "ARCHIVED")}
                        className="border border-white/25 px-3 py-1.5 font-mono text-[10px] text-white uppercase hover:border-white"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(selectedMessage)}
                      className="border border-white/25 px-3 py-1.5 font-mono text-[10px] text-white/80 uppercase hover:border-white hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 border border-white/10 bg-navy p-5">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">
                    {selectedMessage.message}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                    className="inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Reply via Email
                  </a>
                  <span className="font-mono text-[10px] text-white/50">
                    Message ID: {selectedMessage.id}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminUsersView({
  users,
  loading,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  onSearch,
  onUpdateUser,
  onInspectUser,
  onRevokeSessions,
  inspectedUser,
  inspectedSessions,
  inspectedActivity,
  onCloseInspector,
}: {
  users: User[];
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onSearch: () => void;
  onUpdateUser: (
    user: User,
    patch: { status?: "ACTIVE" | "SUSPENDED" | "PENDING"; emailVerified?: boolean }
  ) => void;
  onInspectUser: (user: User) => void;
  onRevokeSessions: (user: User) => void;
  inspectedUser: User | null;
  inspectedSessions: SessionInfo[];
  inspectedActivity: AuditLogItem[];
  onCloseInspector: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search users by name or email..."
            className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="USER">USER</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>

        <button
          type="button"
          onClick={onSearch}
          className="bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
        >
          Filter Users
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No matching users"
          description="No registered user accounts matched your current search or filter."
        />
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3">Email Verification</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="font-mono text-[11px] text-white/65">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold ${
                        u.role === "ADMIN"
                          ? "bg-white text-navy"
                          : "border border-white/20 text-white/80"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] ${
                        u.status === "ACTIVE"
                          ? "border border-white/30 bg-white/10 text-white"
                          : "border border-white/25 text-white/65"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px]">
                    {u.emailVerified ? (
                      <span className="text-white">VERIFIED</span>
                    ) : (
                      <span className="text-white/55">UNVERIFIED</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/65">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/65">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onInspectUser(u)}
                        className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                      >
                        Details
                      </button>
                      {!u.emailVerified && (
                        <button
                          type="button"
                          onClick={() => onUpdateUser(u, { emailVerified: true, status: "ACTIVE" })}
                          className="bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-navy uppercase"
                        >
                          Verify
                        </button>
                      )}
                      {u.role !== "ADMIN" && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateUser(u, {
                              status: u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                            })
                          }
                          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                        >
                          {u.status === "SUSPENDED" ? "Activate" : "Suspend"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inspectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto border border-white/30 bg-navy p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                  User Account & Security Inspector
                </p>
                <h3 className="mt-1 text-base font-bold text-white">
                  {inspectedUser.name} ({inspectedUser.email})
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseInspector}
                className="border border-white/20 p-1.5 text-white/70 hover:border-white hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">Role</span>
                <p className="mt-1 font-mono text-xs font-bold text-white">{inspectedUser.role}</p>
              </div>
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">Status</span>
                <p className="mt-1 font-mono text-xs font-bold text-white">{inspectedUser.status}</p>
              </div>
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">Registered</span>
                <p className="mt-1 font-mono text-xs text-white">
                  {new Date(inspectedUser.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">Last Login</span>
                <p className="mt-1 font-mono text-xs text-white">
                  {inspectedUser.lastLoginAt
                    ? new Date(inspectedUser.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Active Sessions ({inspectedSessions.length})
                </h4>
                {inspectedSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onRevokeSessions(inspectedUser)}
                    className="border border-white/25 px-3 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                  >
                    Revoke All Sessions
                  </button>
                )}
              </div>
              {inspectedSessions.length === 0 ? (
                <p className="mt-2 text-xs text-white/55">No active sessions found for this user.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {inspectedSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="flex flex-wrap items-center justify-between gap-2 border border-white/15 bg-white/[0.02] px-3.5 py-2.5 font-mono text-[11px]"
                    >
                      <div>
                        <p className="text-white">IP: {sess.ip || "Unknown"}</p>
                        <p className="max-w-md truncate text-[10px] text-white/60">
                          {sess.userAgent || "Browser Session"}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-white/65">
                        <p>
                          Last seen:{" "}
                          {sess.lastSeenAt ? new Date(sess.lastSeenAt).toLocaleString() : "—"}
                        </p>
                        <p>Expires: {new Date(sess.expiresAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Recent Account Activity ({inspectedActivity.length})
              </h4>
              {inspectedActivity.length === 0 ? (
                <p className="mt-2 text-xs text-white/55">
                  No recent audit log entries recorded for this account.
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {inspectedActivity.slice(0, 8).map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between border border-white/10 bg-white/[0.01] px-3 py-2 font-mono text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-white">{act.action}</span>
                        <span className="ml-2 text-white/60">({act.category})</span>
                      </div>
                      <span className="text-[10px] text-white/55">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
