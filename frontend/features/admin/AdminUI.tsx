"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  Search,
  Upload,
  X,
} from "lucide-react";
import { apiFetch, apiUploadMediaFile } from "@/lib/api";
import type { ImageRef, MediaItem } from "@/types";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-5 bottom-5 z-50 flex w-full max-w-sm flex-col gap-2.5"
      role="region"
      aria-label="System notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 border p-4 shadow-2xl transition ${
            t.type === "error"
              ? "border-white bg-navy text-white"
              : t.type === "success"
                ? "border-white bg-white text-navy"
                : "border-white/30 bg-navy text-white"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {t.type === "error" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold tracking-wider uppercase">{t.title}</p>
              {t.message && <p className="mt-1 text-xs leading-relaxed opacity-85">{t.message}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="p-0.5 opacity-70 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  state,
  busy,
  onClose,
}: {
  state: ConfirmDialogState | null;
  busy?: boolean;
  onClose: () => void;
}) {
  if (!state || !state.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md border border-white/30 bg-navy p-6 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/25 bg-white/5">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-white">
              {state.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-white/75">{state.description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-white/15 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="border border-white/20 px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase transition hover:border-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => state.onConfirm()}
            className="bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90 disabled:opacity-50"
          >
            {busy ? "Processing..." : state.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-white/20 bg-white/[0.01] px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5">
        <FolderOpen className="h-4 w-4 text-white/70" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-white">{title}</h4>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-white/60">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 bg-white px-4 py-2 text-xs font-semibold tracking-wider text-navy uppercase transition hover:bg-white/90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 border border-white/15 bg-white/[0.01] p-4">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="flex animate-pulse items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0"
        >
          <div className="h-3.5 w-1/3 bg-white/10" />
          <div className="h-3.5 w-1/6 bg-white/10" />
          <div className="h-3.5 w-1/6 bg-white/10" />
          <div className="h-6 w-20 bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function PaginationBar({
  page,
  totalPages,
  total,
  label = "records",
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  label?: string;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalPages <= 1 && total <= 10) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4 text-xs text-white/70">
      <span>
        Showing page <strong className="text-white">{page}</strong> of{" "}
        <strong className="text-white">{Math.max(1, totalPages)}</strong> ({total} total {label})
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 border border-white/20 px-3 py-1.5 font-mono text-[11px] text-white uppercase transition hover:border-white disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 border border-white/20 px-3 py-1.5 font-mono text-[11px] text-white uppercase transition hover:border-white disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export interface ChartDataPoint {
  label: string;
  primary: number;
  secondary?: number;
}

export function BarChartCard({
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  data,
}: {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel?: string;
  data: ChartDataPoint[];
}) {
  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.primary, d.secondary ?? 0))
  );
  const totalPrimary = data.reduce((acc, d) => acc + d.primary, 0);
  const totalSecondary =
    secondaryLabel !== undefined
      ? data.reduce((acc, d) => acc + (d.secondary ?? 0), 0)
      : undefined;

  return (
    <div className="border border-white/15 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-white/60">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-white" />
            <span className="text-white/80">
              {primaryLabel}: <strong className="font-mono text-white">{totalPrimary}</strong>
            </span>
          </div>
          {secondaryLabel && totalSecondary !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 border border-white/60 bg-white/30" />
              <span className="text-white/80">
                {secondaryLabel}: <strong className="font-mono text-white">{totalSecondary}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-6 gap-3 pt-2">
        {data.map((point) => {
          const primaryHeightPercent = Math.max(
            point.primary > 0 ? 10 : 2,
            Math.round((point.primary / maxVal) * 100)
          );
          const secondaryHeightPercent =
            point.secondary !== undefined
              ? Math.max(
                  point.secondary > 0 ? 10 : 2,
                  Math.round((point.secondary / maxVal) * 100)
                )
              : null;

          return (
            <div key={point.label} className="flex flex-col items-center">
              <div className="mb-1.5 flex items-center gap-1 font-mono text-[10px] text-white/80">
                <span>{point.primary}</span>
                {point.secondary !== undefined && (
                  <span className="text-white/50">/ {point.secondary}</span>
                )}
              </div>
              <div className="flex h-32 w-full items-end justify-center gap-1.5 border-b border-white/20 bg-white/[0.01] px-2 pt-2">
                <div
                  style={{ height: `${primaryHeightPercent}%` }}
                  className="w-full max-w-[18px] bg-white transition-all"
                  title={`${point.label} — ${primaryLabel}: ${point.primary}`}
                />
                {secondaryHeightPercent !== null && (
                  <div
                    style={{ height: `${secondaryHeightPercent}%` }}
                    className="w-full max-w-[18px] border border-white/50 bg-white/30 transition-all"
                    title={`${point.label} — ${secondaryLabel}: ${point.secondary}`}
                  />
                )}
              </div>
              <span className="mt-2 font-mono text-[10px] text-white/65">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MediaPickerModal({
  open,
  title = "Select or Upload Media Asset",
  defaultFolder = "general",
  onClose,
  onSelect,
}: {
  open: boolean;
  title?: string;
  defaultFolder?: "blogs" | "projects" | "profile" | "general";
  onClose: () => void;
  onSelect: (image: ImageRef) => void;
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<"blogs" | "projects" | "profile" | "general">(defaultFolder);
  const [uploadAlt, setUploadAlt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (folderFilter) params.set("folder", folderFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch<{ media: MediaItem[] }>(`/api/admin/media?${params.toString()}`);
      setItems(res.data.media ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setUploadFolder(defaultFolder);
      void fetchMedia();
    }
  }, [open, folderFilter]);

  if (!open) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await apiUploadMediaFile(file, {
        folder: uploadFolder,
        alt: uploadAlt.trim() || file.name,
      });
      const item = res.data.media;
      onSelect({
        media: item.id,
        url: item.url,
        publicId: item.publicId,
        alt: item.alt || file.name,
        width: item.width,
        height: item.height,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Media upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col border border-white/30 bg-navy text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/15 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="h-4 w-4 text-white" />
            <h3 className="text-sm font-bold tracking-wider uppercase">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-white/20 p-1 text-white/70 transition hover:border-white hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-white/15 px-6 py-2.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("library")}
              className={`px-3 py-1.5 text-xs font-semibold uppercase transition ${
                tab === "library"
                  ? "bg-white text-navy"
                  : "border border-white/20 text-white/75 hover:border-white"
              }`}
            >
              Media Library ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`px-3 py-1.5 text-xs font-semibold uppercase transition ${
                tab === "upload"
                  ? "bg-white text-navy"
                  : "border border-white/20 text-white/75 hover:border-white"
              }`}
            >
              Upload New Image
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 border border-white bg-white/10 px-4 py-2.5 text-xs text-white">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "library" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void fetchMedia()}
                    placeholder="Search by public ID or alt text..."
                    className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>
                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                >
                  <option value="">All Folders</option>
                  <option value="blogs">Blogs</option>
                  <option value="projects">Projects</option>
                  <option value="profile">Profile</option>
                  <option value="general">General</option>
                </select>
                <button
                  type="button"
                  onClick={() => void fetchMedia()}
                  className="border border-white/25 px-3 py-2 text-xs font-semibold text-white uppercase hover:border-white"
                >
                  Search
                </button>
              </div>

              {loading ? (
                <TableSkeleton rows={4} />
              ) : items.length === 0 ? (
                <EmptyState
                  title="No media assets found"
                  description="Upload a new image to use it across blog posts, projects, or site settings."
                  actionLabel="Upload Image"
                  onAction={() => setTab("upload")}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect({
                          media: item.id,
                          url: item.url,
                          publicId: item.publicId,
                          alt: item.alt || item.publicId,
                          width: item.width,
                          height: item.height,
                        });
                        onClose();
                      }}
                      className="group flex flex-col border border-white/15 bg-white/[0.02] text-left transition hover:border-white"
                    >
                      <div className="relative aspect-video w-full overflow-hidden border-b border-white/10 bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.alt || item.publicId}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <span className="absolute right-1.5 bottom-1.5 bg-navy/90 px-1.5 py-0.5 font-mono text-[9px] text-white uppercase">
                          {item.format}
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-white">
                          {item.alt || item.publicId}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-white/50">
                          {(item.bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-4 py-4">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                  Target Folder
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
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                  Accessible Alt Text
                </label>
                <input
                  type="text"
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  placeholder="Describe the image..."
                  className="w-full border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                />
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-white/30 bg-white/[0.02] p-8 text-center transition hover:border-white">
                <Upload className="h-6 w-6 text-white" />
                <span className="mt-2 text-xs font-semibold text-white">
                  {uploading ? "Uploading & verifying magic bytes..." : "Click to select image file"}
                </span>
                <span className="mt-1 font-mono text-[10px] text-white/55">
                  PNG, JPEG, WebP, GIF up to 5MB
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
