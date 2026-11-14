"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Eye,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  EmptyState,
  PaginationBar,
  TableSkeleton,
} from "@/features/admin/AdminUI";
import {
  AdminCategoriesView,
  AdminTagsView,
} from "@/features/admin/AdminManagementViews";
import type {
  AuditLogItem,
  CategoryItem,
  ContactMessageItem,
  EmailCampaignItem,
  PaginationMeta,
  RecipientMode,
  Role,
  SessionInfo,
  TagItem,
  User,
} from "@/types";

function getUserInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

// ============================================================================
// 1. COMBINED CATEGORIES & TAGS VIEW
// ============================================================================

export function AdminTaxonomyCombinedView({
  categories,
  tags,
  onSaveCategory,
  onDeleteCategory,
  onSaveTag,
  onDeleteTag,
}: {
  categories: CategoryItem[];
  tags: TagItem[];
  onSaveCategory: (
    payload: { name: string; slug: string; type: "BLOG" | "PROJECT"; description?: string },
    editingId?: string,
  ) => Promise<void>;
  onDeleteCategory: (cat: CategoryItem) => void;
  onSaveTag: (payload: { name: string; slug: string }, editingId?: string) => Promise<void>;
  onDeleteTag: (tag: TagItem) => void;
}) {
  const [subView, setSubView] = useState<"both" | "categories" | "tags">("both");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
            Content Taxonomy Management
          </p>
          <p className="mt-0.5 text-xs text-white/80">
            Manage structured Categories ({categories.length}) and Topic Tags ({tags.length}) for blog posts and projects.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ["both", "All Taxonomy"],
              ["categories", `Categories (${categories.length})`],
              ["tags", `Tags (${tags.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubView(key)}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                subView === key
                  ? "bg-white text-navy"
                  : "border border-white/20 text-white/75 hover:border-white hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {(subView === "both" || subView === "categories") && (
        <div className="space-y-3">
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/80">
            1. Content Categories
          </h3>
          <AdminCategoriesView
            categories={categories}
            onSaveCategory={onSaveCategory}
            onDeleteCategory={onDeleteCategory}
          />
        </div>
      )}

      {(subView === "both" || subView === "tags") && (
        <div className="space-y-3 pt-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white/80">
            2. Topic Tags
          </h3>
          <AdminTagsView tags={tags} onSaveTag={onSaveTag} onDeleteTag={onDeleteTag} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. ADVANCED USER MANAGEMENT VIEW
// ============================================================================

export interface UsersSummaryCounts {
  total: number;
  USER: number;
  EDITOR: number;
  ADMIN: number;
  SUPER_ADMIN: number;
  verified: number;
  unverified: number;
  active: number;
  suspended: number;
}

export function AdminAdvancedUsersView({
  currentAdmin,
  users,
  summary,
  meta,
  loading,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  verifiedFilter,
  setVerifiedFilter,
  sortBy,
  sortOrder,
  onToggleSort,
  onSearch,
  onPageChange,
  onUpdateUserStatus,
  onChangeUserRole,
  onInspectUser,
  onRevokeSessions,
  onEmailUser,
  inspectedUser,
  inspectedSessions,
  inspectedActivity,
  onCloseInspector,
}: {
  currentAdmin: User | null;
  users: User[];
  summary?: UsersSummaryCounts;
  meta: PaginationMeta;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  verifiedFilter: string;
  setVerifiedFilter: (v: string) => void;
  sortBy: "createdAt" | "lastLoginAt" | "name" | "email" | "role" | "status";
  sortOrder: "asc" | "desc";
  onToggleSort: (field: "createdAt" | "lastLoginAt" | "name" | "email" | "role" | "status") => void;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onUpdateUserStatus: (
    user: User,
    patch: { status?: "ACTIVE" | "SUSPENDED" | "PENDING"; emailVerified?: boolean },
  ) => void;
  onChangeUserRole: (user: User, newRole: Role) => void;
  onInspectUser: (user: User) => void;
  onRevokeSessions: (user: User) => void;
  onEmailUser: (user: User) => void;
  inspectedUser: User | null;
  inspectedSessions: SessionInfo[];
  inspectedActivity: AuditLogItem[];
  onCloseInspector: () => void;
}) {
  const renderSortIcon = (
    field: "createdAt" | "lastLoginAt" | "name" | "email" | "role" | "status",
  ) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-white" />
    ) : (
      <ArrowDown className="h-3 w-3 text-white" />
    );
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total Registered", value: summary.total, sub: `${summary.active} Active` },
            {
              label: "Verified Accounts",
              value: summary.verified,
              sub: `${summary.unverified} Unverified`,
            },
            {
              label: "Administrators",
              value: summary.ADMIN + summary.SUPER_ADMIN,
              sub: `${summary.SUPER_ADMIN} Super Admin · ${summary.ADMIN} Admin`,
            },
            {
              label: "Editors & Staff",
              value: summary.EDITOR,
              sub: "Content Management Role",
            },
            {
              label: "Suspended Accounts",
              value: summary.suspended,
              sub: "Restricted Access",
            },
          ].map((item) => (
            <div key={item.label} className="border border-white/15 bg-white/[0.02] p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                {item.label}
              </p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-white">{item.value}</p>
              <p className="mt-1 text-[11px] text-white/60">{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Multi-Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search users by full name or email address..."
            className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">SUPER ADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="EDITOR">EDITOR</option>
          <option value="USER">USER</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by account status"
          className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>

        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          aria-label="Filter by verification status"
          className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
        >
          <option value="">All Verification</option>
          <option value="true">Verified Only</option>
          <option value="false">Unverified Only</option>
        </select>

        <button
          type="button"
          onClick={onSearch}
          className="bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
        >
          Search &amp; Filter
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No matching users found"
          description="No registered user accounts matched your current search or filter parameters."
        />
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/65">
              <tr>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleSort("name")}
                    className="inline-flex items-center gap-1.5 font-bold uppercase hover:text-white"
                  >
                    <span>User &amp; Profile</span>
                    {renderSortIcon("name")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleSort("role")}
                    className="inline-flex items-center gap-1.5 font-bold uppercase hover:text-white"
                  >
                    <span>Role Assignment</span>
                    {renderSortIcon("role")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleSort("status")}
                    className="inline-flex items-center gap-1.5 font-bold uppercase hover:text-white"
                  >
                    <span>Status</span>
                    {renderSortIcon("status")}
                  </button>
                </th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleSort("createdAt")}
                    className="inline-flex items-center gap-1.5 font-bold uppercase hover:text-white"
                  >
                    <span>Registered</span>
                    {renderSortIcon("createdAt")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleSort("lastLoginAt")}
                    className="inline-flex items-center gap-1.5 font-bold uppercase hover:text-white"
                  >
                    <span>Last Login</span>
                    {renderSortIcon("lastLoginAt")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => {
                const isSelf = currentAdmin?.id === u.id;
                const isTargetSuperAdmin = u.role === "SUPER_ADMIN";
                const canChangeRole =
                  !isSelf && (!isTargetSuperAdmin || currentAdmin?.role === "SUPER_ADMIN");

                return (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    {/* Avatar + Name + Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-white/25 bg-navy font-mono text-xs font-bold text-white">
                          {u.avatar?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.avatar.url}
                              alt={u.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{getUserInitials(u.name)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-white">{u.name}</p>
                            {isSelf && (
                              <span className="border border-white/40 px-1.5 py-0.5 font-mono text-[9px] uppercase text-white">
                                You
                              </span>
                            )}
                          </div>
                          <p className="truncate font-mono text-[11px] text-white/65">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Direct Role Selector */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          disabled={!canChangeRole}
                          aria-label={`Change role for ${u.name}`}
                          onChange={(e) => onChangeUserRole(u, e.target.value as Role)}
                          className={`border px-2.5 py-1 font-mono text-[11px] font-bold uppercase focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                            u.role === "ADMIN" || u.role === "SUPER_ADMIN"
                              ? "border-white bg-white text-navy"
                              : "border-white/25 bg-navy text-white"
                          }`}
                        >
                          <option value="USER" className="bg-navy text-white">
                            USER
                          </option>
                          <option value="EDITOR" className="bg-navy text-white">
                            EDITOR
                          </option>
                          <option value="ADMIN" className="bg-navy text-white">
                            ADMIN
                          </option>
                          <option value="SUPER_ADMIN" className="bg-navy text-white">
                            SUPER ADMIN
                          </option>
                        </select>
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          u.status === "ACTIVE"
                            ? "border border-white/40 bg-white/10 text-white"
                            : u.status === "SUSPENDED"
                              ? "border border-white text-white"
                              : "border border-white/20 text-white/65"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* Email Verification */}
                    <td className="px-4 py-3 font-mono text-[10px]">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 font-bold text-navy">
                          <Check className="h-3 w-3" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 border border-white/25 px-2 py-0.5 text-white/65">
                          UNVERIFIED
                        </span>
                      )}
                    </td>

                    {/* Registration Date */}
                    <td className="px-4 py-3 font-mono text-[11px] text-white/70">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 font-mono text-[11px] text-white/70">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onInspectUser(u)}
                          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase transition hover:border-white"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onEmailUser(u)}
                          className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase transition hover:border-white"
                          title={`Send email to ${u.email}`}
                        >
                          Email
                        </button>
                        {!u.emailVerified && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateUserStatus(u, { emailVerified: true, status: "ACTIVE" })
                            }
                            className="bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-navy uppercase"
                          >
                            Verify
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateUserStatus(u, {
                                status: u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                              })
                            }
                            className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white/85 uppercase transition hover:border-white hover:text-white"
                          >
                            {u.status === "SUSPENDED" ? "Activate" : "Suspend"}
                          </button>
                        )}
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
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        label="registered users"
        onPageChange={onPageChange}
      />

      {/* User Details Inspector Modal */}
      {inspectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto border border-white/30 bg-navy p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-white/30 bg-navy font-mono text-sm font-bold text-white">
                  {inspectedUser.avatar?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inspectedUser.avatar.url}
                      alt={inspectedUser.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getUserInitials(inspectedUser.name)}</span>
                  )}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                    User Account &amp; Role Inspector
                  </p>
                  <h3 className="mt-0.5 text-base font-bold text-white">
                    {inspectedUser.name} ({inspectedUser.email})
                  </h3>
                </div>
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
                <p className="mt-1 font-mono text-xs font-bold text-white">
                  {inspectedUser.role}
                </p>
              </div>
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">Status</span>
                <p className="mt-1 font-mono text-xs font-bold text-white">
                  {inspectedUser.status}
                </p>
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
                    ? new Date(inspectedUser.lastLoginAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            {/* Quick Role & Status Controls Inside Inspector */}
            {currentAdmin?.id !== inspectedUser.id && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white">
                    Administrative Role &amp; Access Controls
                  </p>
                  <p className="mt-0.5 text-xs text-white/65">
                    Promote or demote this user immediately with server-side RBAC validation and audit logging.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["USER", "EDITOR", "ADMIN", "SUPER_ADMIN"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={inspectedUser.role === r}
                      onClick={() => onChangeUserRole(inspectedUser, r)}
                      className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition ${
                        inspectedUser.role === r
                          ? "bg-white text-navy"
                          : "border border-white/25 text-white hover:border-white"
                      }`}
                    >
                      {r.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Active Devices ({inspectedSessions.length})
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
                <p className="mt-2 text-xs text-white/55">No active sessions for this user.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {inspectedSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="flex flex-wrap items-center justify-between gap-2 border border-white/15 bg-white/[0.02] px-3.5 py-2.5 font-mono text-[11px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Monitor className="h-4 w-4 text-white/75" />
                        <div>
                          <p className="font-semibold text-white">
                            {sess.deviceName || "Web Browser"}
                          </p>
                          <p className="text-[10px] text-white/60">IP: {sess.ip || "Recorded"}</p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-white/65">
                        <p>
                          Last active:{" "}
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
                Recent Audit Trail ({inspectedActivity.length})
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

// ============================================================================
// 3. ROLES & PERMISSIONS VIEW
// ============================================================================

export function AdminRolesPermissionsView({
  currentAdmin,
  users,
  summary,
  onChangeUserRole,
  onNavigateToUsers,
}: {
  currentAdmin: User | null;
  users: User[];
  summary?: UsersSummaryCounts;
  onChangeUserRole: (user: User, newRole: Role) => void;
  onNavigateToUsers: (roleFilter: string) => void;
}) {
  const roleDefinitions: Array<{
    role: Role;
    title: string;
    count: number;
    description: string;
    permissions: string[];
  }> = [
    {
      role: "SUPER_ADMIN",
      title: "Super Admin",
      count: summary?.SUPER_ADMIN ?? users.filter((u) => u.role === "SUPER_ADMIN").length,
      description:
        "Highest privilege tier with unrestricted governance over administrator promotions, security configuration, and platform operations.",
      permissions: [
        "Grant or revoke ADMIN and SUPER_ADMIN roles",
        "Full Content, Portfolio, Media & Taxonomy control",
        "Send platform-wide Email Campaigns",
        "Inspect all Audit Logs & Security settings",
      ],
    },
    {
      role: "ADMIN",
      title: "Administrator",
      count: summary?.ADMIN ?? users.filter((u) => u.role === "ADMIN").length,
      description:
        "Full operational administrator capable of managing users, content, contact messages, email notifications, and site settings.",
      permissions: [
        "Manage Users, Editors, and Standard Accounts",
        "Publish & edit Blogs, Projects, Categories, Tags, and Media",
        "Manage Contact Messages & send Email Campaigns",
        "Update Site Settings, SEO, and inspect Audit Logs",
      ],
    },
    {
      role: "EDITOR",
      title: "Content Editor",
      count: summary?.EDITOR ?? users.filter((u) => u.role === "EDITOR").length,
      description:
        "Editorial staff role designed for authoring and maintaining technical articles, portfolio case studies, and media assets.",
      permissions: [
        "Author and edit Blog Posts & Projects",
        "Manage Categories, Tags, and Media Library assets",
        "Cannot modify User Roles or System Security settings",
      ],
    },
    {
      role: "USER",
      title: "Standard User",
      count: summary?.USER ?? users.filter((u) => u.role === "USER").length,
      description:
        "Authenticated platform member with access to personal Profile settings, security preferences, and verified account features.",
      permissions: [
        "Manage personal Profile, Avatar, Bio, and Password",
        "Configure personal Security & Email Notification preferences",
        "No access to the Admin Console or administrative APIs",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Security Governance Banner */}
      <div className="border border-white/20 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
              Least-Privilege Access Control (RBAC)
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              Role Hierarchy &amp; Permission Governance
            </h2>
            <p className="mt-1 text-xs text-white/70">
              Every role assignment is validated on the backend, protected by confirmation dialogs, and permanently recorded in Audit Logs.
            </p>
          </div>
          <div className="border border-white/25 bg-navy px-4 py-2.5 font-mono text-xs text-white">
            Your Active Role: <strong>{currentAdmin?.role}</strong>
          </div>
        </div>
      </div>

      {/* 4 Role Definition Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {roleDefinitions.map((def) => (
          <div
            key={def.role}
            className="flex flex-col justify-between border border-white/15 bg-white/[0.02] p-6"
          >
            <div>
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-white" />
                  <h3 className="text-base font-bold text-white">{def.title}</h3>
                  <span className="border border-white/30 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                    {def.role}
                  </span>
                </div>
                <span className="bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-navy">
                  {def.count} account(s)
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-white/75">{def.description}</p>

              <ul className="mt-4 space-y-1.5 text-xs text-white/85">
                {def.permissions.map((perm) => (
                  <li key={perm} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-white" />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => onNavigateToUsers(def.role)}
                className="border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white"
              >
                View {def.title} Accounts →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Direct Role Assignment Directory */}
      <div className="border border-white/15 bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Quick Role Assignment Directory
            </h3>
            <p className="mt-0.5 text-xs text-white/65">
              Promote or demote user accounts directly without accessing MongoDB. Self-elevation and removing the last administrator are automatically blocked.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-white/15">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/65">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Current Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.slice(0, 15).map((u) => {
                const isSelf = currentAdmin?.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">
                        {u.name} {isSelf && <span className="font-mono text-[10px] text-white/60">(You)</span>}
                      </p>
                      <p className="font-mono text-[11px] text-white/65">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] font-bold ${
                          u.role === "ADMIN" || u.role === "SUPER_ADMIN"
                            ? "bg-white text-navy"
                            : "border border-white/25 text-white"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-white/75">
                      {u.status} · {u.emailVerified ? "VERIFIED" : "UNVERIFIED"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="font-mono text-[10px] text-white/50">
                          Protected (Current Session)
                        </span>
                      ) : (
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {(["USER", "EDITOR", "ADMIN", "SUPER_ADMIN"] as Role[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              disabled={u.role === r}
                              onClick={() => onChangeUserRole(u, r)}
                              className={`px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition ${
                                u.role === r
                                  ? "bg-white text-navy"
                                  : "border border-white/20 text-white/80 hover:border-white hover:text-white"
                              }`}
                            >
                              {r.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. ADVANCED CONTACT MESSAGE MANAGEMENT VIEW
// ============================================================================

export function AdminAdvancedMessagesView({
  messages,
  counts,
  meta,
  loading,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  selectedIds,
  setSelectedIds,
  onSearch,
  onPageChange,
  onUpdateStatus,
  onDeleteMessage,
  onBulkAction,
}: {
  messages: ContactMessageItem[];
  counts?: { total: number; unread: number; read: number; archived: number };
  meta: PaginationMeta;
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onUpdateStatus: (id: string, status: "NEW" | "READ" | "ARCHIVED") => Promise<void>;
  onDeleteMessage: (msg: ContactMessageItem) => void;
  onBulkAction: (
    action: "MARK_READ" | "MARK_UNREAD" | "MARK_ALL_READ" | "DELETE_SELECTED" | "DELETE_ALL",
  ) => void;
}) {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === activeMessageId) || messages[0] || null,
    [messages, activeMessageId],
  );

  const allOnPageSelected =
    messages.length > 0 && messages.every((m) => selectedIds.includes(m.id));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !messages.some((m) => m.id === id)));
    } else {
      const pageIds = messages.map((m) => m.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Search & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search by sender name, email, subject, or message content..."
            className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["", `All (${counts?.total ?? meta.total})`],
              ["NEW", `Unread (${counts?.unread ?? 0})`],
              ["READ", `Read (${counts?.read ?? 0})`],
              ["ARCHIVED", `Archived (${counts?.archived ?? 0})`],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-2 text-xs font-semibold uppercase transition ${
                statusFilter === val
                  ? "bg-white text-navy"
                  : "border border-white/20 text-white/75 hover:border-white hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSearch}
          className="bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90"
        >
          Search
        </button>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAllOnPage}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {allOnPageSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>Select Page ({selectedIds.length} selected)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onBulkAction("MARK_ALL_READ")}
            disabled={(counts?.unread ?? 0) === 0 && messages.length === 0}
            className="border border-white/25 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase text-white transition hover:border-white disabled:opacity-40"
          >
            Mark All as Read
          </button>
          <button
            type="button"
            onClick={() => onBulkAction("MARK_READ")}
            disabled={selectedIds.length === 0}
            className="border border-white/25 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase text-white transition hover:border-white disabled:opacity-40"
          >
            Mark Selected as Read
          </button>
          <button
            type="button"
            onClick={() => onBulkAction("MARK_UNREAD")}
            disabled={selectedIds.length === 0}
            className="border border-white/25 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase text-white transition hover:border-white disabled:opacity-40"
          >
            Mark Selected as Unread
          </button>
          <button
            type="button"
            onClick={() => onBulkAction("DELETE_SELECTED")}
            disabled={selectedIds.length === 0}
            className="border border-white/30 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase text-white transition hover:border-white disabled:opacity-40"
          >
            Delete Selected ({selectedIds.length})
          </button>
          <button
            type="button"
            onClick={() => onBulkAction("DELETE_ALL")}
            disabled={(counts?.total ?? messages.length) === 0}
            className="bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-navy transition hover:bg-white/90 disabled:opacity-40"
          >
            Delete All Messages
          </button>
        </div>
      </div>

      {/* Master-Detail Message Reader */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : messages.length === 0 ? (
        <EmptyState
          title="No contact messages found"
          description="Incoming inquiries submitted through the public Contact form will appear here."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left 5 Columns: Selectable Message List */}
          <div className="space-y-2 lg:col-span-5">
            {messages.map((msg) => {
              const active = selectedMessage?.id === msg.id;
              const checked = selectedIds.includes(msg.id);
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 border p-4 transition ${
                    active
                      ? "border-white bg-white/[0.06]"
                      : "border-white/15 bg-white/[0.02] hover:border-white/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSelectOne(msg.id)}
                    className="mt-0.5 text-white/80 hover:text-white"
                    aria-label={`Select message ${msg.subject}`}
                  >
                    {checked ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMessageId(msg.id);
                      if (msg.status === "NEW") {
                        void onUpdateStatus(msg.id, "READ");
                      }
                    }}
                    className="min-w-0 flex-1 text-left"
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
                    <p className="mt-1 line-clamp-1 text-xs text-white/55">{msg.message}</p>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right 7 Columns: Message Details Panel */}
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
                        {selectedMessage.status === "NEW" ? "UNREAD" : selectedMessage.status}
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
                        Mark as Read
                      </button>
                    )}
                    {selectedMessage.status !== "NEW" && (
                      <button
                        type="button"
                        onClick={() => void onUpdateStatus(selectedMessage.id, "NEW")}
                        className="border border-white/25 px-3 py-1.5 font-mono text-[10px] text-white uppercase hover:border-white"
                      >
                        Mark as Unread
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

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                    className="inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Reply to {selectedMessage.name}
                  </a>
                  <span className="font-mono text-[10px] text-white/50">
                    ID: {selectedMessage.id}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PaginationBar
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        label="contact messages"
        onPageChange={onPageChange}
      />
    </div>
  );
}

// ============================================================================
// 5. ADMIN EMAIL CENTER VIEW
// ============================================================================

export function AdminEmailCenterView({
  users,
  currentAdmin,
  recipientMode,
  setRecipientMode,
  selectedRecipientIds,
  setSelectedRecipientIds,
  subject,
  setSubject,
  bodyHtml,
  setBodyHtml,
  testEmail,
  setTestEmail,
  respectConsent,
  setRespectConsent,
  previewHtml,
  previewLoading,
  sending,
  lastCampaignResult,
  onGeneratePreview,
  onSendTestEmail,
  onDispatchCampaign,
  onViewHistory,
}: {
  users: User[];
  currentAdmin: User | null;
  recipientMode: "SINGLE" | "SELECTED" | "ALL";
  setRecipientMode: (m: "SINGLE" | "SELECTED" | "ALL") => void;
  selectedRecipientIds: string[];
  setSelectedRecipientIds: React.Dispatch<React.SetStateAction<string[]>>;
  subject: string;
  setSubject: (v: string) => void;
  bodyHtml: string;
  setBodyHtml: (v: string) => void;
  testEmail: string;
  setTestEmail: (v: string) => void;
  respectConsent: boolean;
  setRespectConsent: (v: boolean) => void;
  previewHtml: string | null;
  previewLoading: boolean;
  sending: boolean;
  lastCampaignResult: EmailCampaignItem | null;
  onGeneratePreview: () => void;
  onSendTestEmail: () => void;
  onDispatchCampaign: () => void;
  onViewHistory: () => void;
}) {
  const [recipientSearch, setRecipientSearch] = useState("");
  const [editorTab, setEditorTab] = useState<"compose" | "preview">("compose");

  const filteredUsers = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, recipientSearch]);

  const toggleRecipient = (userId: string) => {
    if (recipientMode === "SINGLE") {
      setSelectedRecipientIds([userId]);
      return;
    }
    setSelectedRecipientIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const selectAllFiltered = () => {
    const allIds = filteredUsers.map((u) => u.id);
    setSelectedRecipientIds(allIds);
  };

  return (
    <div className="space-y-6">
      {/* Delivery Report Banner if a campaign was just sent */}
      {lastCampaignResult && (
        <div className="border border-white bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/70">
                Latest Campaign Delivery Report
              </p>
              <h3 className="mt-1 text-base font-bold text-white">
                {lastCampaignResult.subject}
              </h3>
              <p className="mt-1 font-mono text-xs text-white/85">
                Status: <strong>{lastCampaignResult.status}</strong> · Sent:{" "}
                <strong>{lastCampaignResult.sentCount}</strong> / {lastCampaignResult.recipientCount}{" "}
                · Failed: <strong>{lastCampaignResult.failedCount}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onViewHistory}
              className="bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy"
            >
              View Full Email History
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 5 Columns: Recipient Selection */}
        <div className="space-y-5 border border-white/15 bg-white/[0.02] p-6 lg:col-span-5">
          <div className="border-b border-white/15 pb-3">
            <h3 className="text-base font-bold text-white">1. Select Recipients</h3>
            <p className="mt-0.5 text-xs text-white/65">
              Emails are delivered individually per user—recipient addresses are never exposed to other users.
            </p>
          </div>

          {/* Recipient Mode Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["SINGLE", "One User"],
                ["SELECTED", "Selected Users"],
                ["ALL", "All Users"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setRecipientMode(mode);
                  if (mode === "SINGLE" && selectedRecipientIds.length > 1) {
                    setSelectedRecipientIds(selectedRecipientIds.slice(0, 1));
                  }
                }}
                className={`py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                  recipientMode === mode
                    ? "bg-white text-navy"
                    : "border border-white/20 text-white/80 hover:border-white hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {recipientMode === "ALL" ? (
            <div className="border border-white/20 bg-navy p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-white" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Broadcast to All Active Verified Users
                  </p>
                  <p className="mt-0.5 text-xs text-white/70">
                    {users.filter((u) => u.emailVerified && u.status === "ACTIVE").length} verified active user(s) loaded in directory.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="Search user by name or email..."
                    className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
                  />
                </div>
                {recipientMode === "SELECTED" && (
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="border border-white/25 px-3 py-2 font-mono text-[10px] font-semibold uppercase text-white hover:border-white"
                  >
                    Select All
                  </button>
                )}
              </div>

              <div className="max-h-72 divide-y divide-white/10 overflow-y-auto border border-white/15 bg-navy">
                {filteredUsers.map((u) => {
                  const isSelected = selectedRecipientIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleRecipient(u.id)}
                      className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition ${
                        isSelected ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-semibold text-white">{u.name}</p>
                        <p className="truncate font-mono text-[11px] text-white/65">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/55">{u.role}</span>
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-white" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-white/40" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="font-mono text-[11px] text-white/70">
                Selected Recipients: <strong>{selectedRecipientIds.length}</strong>
              </p>
            </div>
          )}

          {/* Consent Toggle */}
          <div className="border-t border-white/15 pt-4">
            <label className="flex cursor-pointer items-start gap-3 text-xs">
              <input
                type="checkbox"
                checked={respectConsent}
                onChange={(e) => setRespectConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-white"
              />
              <div>
                <span className="font-semibold text-white">
                  Respect User Email Notification Preferences
                </span>
                <p className="mt-0.5 text-[11px] text-white/60">
                  Skip users who opted out of platform announcements in their Profile settings.
                </p>
              </div>
            </label>
          </div>

          {/* Test Email Box */}
          <div className="border-t border-white/15 pt-4">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-white/70">
              Send Test Email First
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={currentAdmin?.email || "admin@dezaakir.com"}
                className="flex-1 border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
              />
              <button
                type="button"
                onClick={onSendTestEmail}
                disabled={sending}
                className="border border-white/30 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white disabled:opacity-50"
              >
                Send Test
              </button>
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Compose & Live Branded Preview */}
        <div className="space-y-5 border border-white/15 bg-white/[0.02] p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                2. Compose Official Branded Email
              </h3>
              <p className="mt-0.5 text-xs text-white/65">
                Wrapped automatically in the responsive Dezaakir Navy (#0B1628) &amp; White (#FFFFFF) HTML template.
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setEditorTab("compose")}
                className={`px-3 py-1.5 text-xs font-bold uppercase ${
                  editorTab === "compose"
                    ? "bg-white text-navy"
                    : "border border-white/20 text-white/75"
                }`}
              >
                Compose
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditorTab("preview");
                  onGeneratePreview();
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase ${
                  editorTab === "preview"
                    ? "bg-white text-navy"
                    : "border border-white/20 text-white/75"
                }`}
              >
                Live Email Preview
              </button>
            </div>
          </div>

          {editorTab === "compose" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/75">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Important Platform Update from Dezaakir"
                  className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/75">
                  Message Content (Rich HTML &amp; Plain-Text Fallback)
                </label>
                <RichTextEditor
                  value={bodyHtml}
                  onChange={setBodyHtml}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Rendered Dezaakir HTML Email Preview
                </span>
                <button
                  type="button"
                  onClick={onGeneratePreview}
                  disabled={previewLoading}
                  className="border border-white/25 px-3 py-1 font-mono text-[10px] uppercase text-white hover:border-white"
                >
                  {previewLoading ? "Rendering..." : "Refresh Preview"}
                </button>
              </div>
              <div className="overflow-hidden border border-white/25 bg-[#0B1628]">
                {previewHtml ? (
                  <iframe
                    title="Branded Email Preview"
                    srcDoc={previewHtml}
                    className="h-[440px] w-full border-0"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex h-[320px] items-center justify-center p-6 text-xs text-white/60">
                    Click &ldquo;Refresh Preview&rdquo; to render the email template.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
            <span className="font-mono text-xs text-white/70">
              Mode: <strong>{recipientMode}</strong>
              {recipientMode !== "ALL" && ` (${selectedRecipientIds.length} recipient(s))`}
            </span>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditorTab("preview");
                  onGeneratePreview();
                }}
                className="border border-white/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:border-white"
              >
                Preview Email
              </button>
              <button
                type="button"
                onClick={onDispatchCampaign}
                disabled={sending}
                className="inline-flex items-center gap-2 bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Dispatching Emails..." : "Send Email Campaign"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. EMAIL HISTORY VIEW
// ============================================================================

export function AdminEmailHistoryView({
  campaigns,
  meta,
  loading,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onSearch,
  onPageChange,
  onInspectCampaign,
  inspectedCampaign,
  onCloseInspector,
}: {
  campaigns: EmailCampaignItem[];
  meta: PaginationMeta;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onInspectCampaign: (id: string) => void;
  inspectedCampaign: EmailCampaignItem | null;
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
            placeholder="Search email history by subject or initiating administrator..."
            className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="FAILED">FAILED</option>
          <option value="PROCESSING">PROCESSING</option>
        </select>

        <button
          type="button"
          onClick={onSearch}
          className="bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy"
        >
          Filter History
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No email campaigns recorded yet"
          description="Emails dispatched from the Admin Email Center will be logged here with delivery telemetry."
        />
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/65">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Successful</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Date Sent</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-white">{c.subject}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-white/75">
                    {c.recipientMode}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">{c.recipientCount}</td>
                  <td className="px-4 py-3 font-mono text-white">{c.sentCount}</td>
                  <td className="px-4 py-3 font-mono text-white/75">{c.failedCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold ${
                        c.status === "COMPLETED"
                          ? "bg-white text-navy"
                          : "border border-white/30 text-white"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/75">
                    {c.senderName} ({c.senderEmail})
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/65">
                    {new Date(c.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectCampaign(c.id)}
                      className="border border-white/25 px-2.5 py-1 font-mono text-[10px] uppercase text-white hover:border-white"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        label="email campaigns"
        onPageChange={onPageChange}
      />

      {inspectedCampaign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto border border-white/30 bg-navy p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                  Email Campaign Delivery Report
                </p>
                <h3 className="mt-1 text-base font-bold text-white">
                  {inspectedCampaign.subject}
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
                <span className="font-mono text-[10px] uppercase text-white/55">Status</span>
                <p className="mt-1 font-mono text-xs font-bold text-white">
                  {inspectedCampaign.status}
                </p>
              </div>
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">
                  Total Recipients
                </span>
                <p className="mt-1 font-mono text-xs font-bold text-white">
                  {inspectedCampaign.recipientCount}
                </p>
              </div>
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">
                  Successful Deliveries
                </span>
                <p className="mt-1 font-mono text-xs font-bold text-white">
                  {inspectedCampaign.sentCount}
                </p>
              </div>
              <div className="border border-white/15 bg-white/[0.02] p-3">
                <span className="font-mono text-[10px] uppercase text-white/55">
                  Failed Deliveries
                </span>
                <p className="mt-1 font-mono text-xs font-bold text-white">
                  {inspectedCampaign.failedCount}
                </p>
              </div>
            </div>

            {inspectedCampaign.recipients && inspectedCampaign.recipients.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Per-Recipient Delivery Log ({inspectedCampaign.recipients.length})
                </h4>
                <div className="mt-2 max-h-60 divide-y divide-white/10 overflow-y-auto border border-white/15">
                  {inspectedCampaign.recipients.map((r, idx) => (
                    <div
                      key={`${r.email}-${idx}`}
                      className="flex items-center justify-between px-3.5 py-2 font-mono text-[11px]"
                    >
                      <div>
                        <span className="text-white">{r.name || "User"}</span>{" "}
                        <span className="text-white/60">({r.email})</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold ${
                          r.status === "SENT"
                            ? "bg-white text-navy"
                            : "border border-white/30 text-white"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. SYSTEM SECURITY VIEW
// ============================================================================

export function AdminSecurityCenterView({
  currentAdmin,
  securityLogs,
  onSetupMfa,
  onEnableMfa,
  mfaSecret,
  mfaOtpauthUri,
  mfaRecoveryCodes,
  mfaBusy,
  onOpenFullAuditLogs,
}: {
  currentAdmin: User | null;
  securityLogs: AuditLogItem[];
  onSetupMfa: () => void;
  onEnableMfa: (code: string) => void;
  mfaSecret: string | null;
  mfaOtpauthUri: string | null;
  mfaRecoveryCodes: string[] | null;
  mfaBusy: boolean;
  onOpenFullAuditLogs: () => void;
}) {
  const [totpCode, setTotpCode] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Administrator TOTP MFA Card */}
        <div className="border border-white/15 bg-white/[0.02] p-6">
          <div className="flex items-start justify-between border-b border-white/15 pb-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <KeyRound className="h-4 w-4" />
                Administrator Multi-Factor Authentication (TOTP)
              </h3>
              <p className="mt-1 text-xs text-white/65">
                Protect privileged administrator accounts with time-based one-time codes (Google Authenticator, Authy, 1Password).
              </p>
            </div>
            <span
              className={`px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
                currentAdmin?.mfa?.enabled
                  ? "bg-white text-navy"
                  : "border border-white/25 text-white/80"
              }`}
            >
              {currentAdmin?.mfa?.enabled ? "MFA ENABLED" : "NOT ENROLLED"}
            </span>
          </div>

          {currentAdmin?.mfa?.enabled ? (
            <div className="mt-5 border border-white/20 bg-navy p-4 text-xs text-white/85">
              <p className="font-semibold text-white">
                TOTP Multi-Factor Authentication is active on your administrator account.
              </p>
              {currentAdmin.mfa.enabledAt && (
                <p className="mt-1 font-mono text-[11px] text-white/60">
                  Enrolled on {new Date(currentAdmin.mfa.enabledAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {!mfaSecret ? (
                <button
                  type="button"
                  onClick={onSetupMfa}
                  disabled={mfaBusy}
                  className="bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-50"
                >
                  {mfaBusy ? "Initializing..." : "Configure Authenticator App"}
                </button>
              ) : (
                <div className="space-y-4 border border-white/20 bg-navy p-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase text-white/60">
                      1. Enter this Secret Key in your Authenticator App:
                    </p>
                    <p className="mt-1 select-all border border-white/20 bg-white/5 px-3 py-2 font-mono text-xs font-bold tracking-widest text-white">
                      {mfaSecret}
                    </p>
                    {mfaOtpauthUri && (
                      <p className="mt-1 truncate font-mono text-[10px] text-white/50">
                        URI: {mfaOtpauthUri}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-white/75">
                      2. Enter 6-Digit Code from Authenticator App:
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-40 border border-white/25 bg-navy px-3 py-2 font-mono text-sm tracking-widest text-white focus:border-white focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={mfaBusy || totpCode.length !== 6}
                        onClick={() => onEnableMfa(totpCode)}
                        className="bg-white px-4 py-2 text-xs font-bold uppercase text-navy disabled:opacity-50"
                      >
                        Verify &amp; Enable
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {mfaRecoveryCodes && mfaRecoveryCodes.length > 0 && (
            <div className="mt-4 border border-white bg-navy p-4">
              <p className="text-xs font-bold uppercase text-white">
                Save Your Single-Use Recovery Codes
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-white">
                {mfaRecoveryCodes.map((c) => (
                  <div key={c} className="border border-white/20 px-2.5 py-1">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Platform Security Architecture Summary */}
        <div className="border border-white/15 bg-white/[0.02] p-6">
          <div className="border-b border-white/15 pb-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Shield className="h-4 w-4" />
              Active Security Controls &amp; Defenses
            </h3>
            <p className="mt-1 text-xs text-white/65">
              Production security controls enforced across all authentication and administrative APIs.
            </p>
          </div>

          <ul className="mt-4 space-y-3 text-xs">
            {[
              {
                title: "Argon2id Password & Secret Hashing",
                desc: "All passwords, OTP codes, and session tokens are hashed before database persistence.",
              },
              {
                title: "HttpOnly + SameSite Session Cookies & Synchronizer CSRF",
                desc: "State-changing requests require a cryptographically derived X-CSRF-Token header.",
              },
              {
                title: "Strict Role-Based Access Control (RBAC)",
                desc: "Server-side role verification prevents self-elevation and protects the last Super Admin.",
              },
              {
                title: "Brute-Force Lockout & Rate Limiting",
                desc: "Automated account lockout after 5 failed sign-in attempts and per-route rate limiters.",
              },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-2.5 border-b border-white/10 pb-2.5 last:border-0">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-white/65">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="border border-white/15 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between border-b border-white/15 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Recent Security &amp; Access Events
            </h3>
            <p className="mt-0.5 text-xs text-white/65">
              Latest authentication, role change, and security alerts recorded in MongoDB.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenFullAuditLogs}
            className="border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:border-white"
          >
            View All Audit Logs →
          </button>
        </div>

        <div className="mt-4 overflow-x-auto border border-white/15">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="border-b border-white/15 bg-white/[0.03] text-[10px] uppercase text-white/60">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Outcome</th>
                <th className="px-4 py-2.5">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {securityLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-white/65">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-white">{log.category}</td>
                  <td className="px-4 py-2.5 font-semibold text-white">{log.action}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold ${
                        log.outcome === "SUCCESS"
                          ? "bg-white text-navy"
                          : "border border-white text-white"
                      }`}
                    >
                      {log.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white/75">{log.actorEmail || "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
