"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  MailCheck,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  EmptyState,
  PaginationBar,
  TableSkeleton,
  type ConfirmDialogState,
} from "@/features/admin/AdminUI";
import { apiFetch } from "@/lib/api";
import type {
  AuditLogItem,
  EmailDeliverabilityReport,
  EmailSuppressionItem,
  ModerationLogItem,
  PaginationMeta,
  RetentionOverviewData,
  SuspiciousActivityData,
  User,
} from "@/types";

type ToastFn = (type: "success" | "error", text: string) => void;
type ConfirmFn = (cfg: Omit<ConfirmDialogState, "open">) => void;

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getUserModerationBadge(u: Pick<User, "status" | "emailVerified" | "suspension">): {
  label: string;
  tone: string;
} {
  if (u.status === "SUSPENDED") {
    if (u.suspension?.type === "PERMANENT") {
      return {
        label: "Permanently Suspended",
        tone: "border-white bg-white text-navy font-semibold",
      };
    }
    return {
      label: "Suspended",
      tone: "border-white/60 bg-white/15 text-white",
    };
  }
  if (!u.emailVerified || u.status === "PENDING") {
    return {
      label: "Email Unverified",
      tone: "border-white/30 bg-white/5 text-white/70",
    };
  }
  return {
    label: "Active",
    tone: "border-white/30 bg-white/10 text-white",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. User Moderation View (1h, 24h, 7d, 30d, Permanent, Reinstate)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminUserModerationView({
  currentAdminId,
  onToast,
  onConfirm,
}: {
  currentAdminId: string;
  onToast: ToastFn;
  onConfirm: ConfirmFn;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "SUSPENDED" | "ACTIVE" | "PENDING">("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 15, total: 0, totalPages: 1 });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [duration, setDuration] = useState<"1H" | "24H" | "7D" | "30D" | "PERMANENT">("24H");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: "15",
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await apiFetch<{ users: User[] }>(`/api/admin/users?${qs.toString()}`);
      setUsers(res.data.users);
      if (res.meta) setMeta(res.meta);
      if (selectedUser) {
        const refreshed = res.data.users.find((u) => u.id === selectedUser.id);
        if (refreshed) setSelectedUser(refreshed);
      }
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, onToast, selectedUser]);

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSuspend = () => {
    if (!selectedUser) return;
    if (reason.trim().length < 3) {
      onToast("error", "Please enter a suspension reason (at least 3 characters).");
      return;
    }
    const durLabel =
      duration === "PERMANENT"
        ? "permanently"
        : duration === "1H"
          ? "for 1 hour"
          : duration === "24H"
            ? "for 24 hours"
            : duration === "7D"
              ? "for 1 week"
              : "for 30 days";

    onConfirm({
      title: `Suspend ${selectedUser.name} ${durLabel}?`,
      description: `This will immediately revoke active sessions and block protected API access for ${selectedUser.email}. Reason: "${reason.trim()}"`,
      confirmLabel: duration === "PERMANENT" ? "Permanently Suspend" : "Suspend User",
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const res = await apiFetch<{ user: User }>(`/api/admin/users/${selectedUser.id}/suspend`, {
            method: "POST",
            body: JSON.stringify({
              duration,
              reason: reason.trim(),
              ...(notes.trim() ? { notes: notes.trim() } : {}),
            }),
          });
          setSelectedUser(res.data.user);
          setReason("");
          setNotes("");
          onToast("success", `User suspended ${durLabel}.`);
          await loadUsers();
        } catch (err) {
          onToast("error", err instanceof Error ? err.message : "Failed to suspend user");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleReinstate = (target: User) => {
    onConfirm({
      title: `Reinstate ${target.name}?`,
      description: `Restore account access for ${target.email} immediately and record reinstatement in Moderation History.`,
      confirmLabel: "Reinstate Account",
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const res = await apiFetch<{ user: User }>(`/api/admin/users/${target.id}/reinstate`, {
            method: "POST",
            body: JSON.stringify({ reason: "Reinstated by administrator" }),
          });
          setSelectedUser(res.data.user);
          onToast("success", `${target.email} has been reinstated.`);
          await loadUsers();
        } catch (err) {
          onToast("error", err instanceof Error ? err.message : "Failed to reinstate user");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">User Moderation &amp; Suspensions</h2>
          <p className="mt-1 text-xs text-white/65">
            Suspend problematic accounts temporarily (1h, 24h, 7d, 30d) or permanently, or reinstate access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadUsers()}
              placeholder="Search name or email..."
              className="border border-white/20 bg-navy py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as "" | "SUSPENDED" | "ACTIVE" | "PENDING");
            }}
            className="border border-white/20 bg-navy px-2.5 py-1.5 text-xs text-white focus:border-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING">Email Unverified</option>
          </select>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Users List */}
        <div className="lg:col-span-7 border border-white/15 bg-white/[0.02]">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={6} />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No matching users"
              description="Adjust your search or status filter."
            />
          ) : (
            <div className="divide-y divide-white/10">
              {users.map((u) => {
                const badge = getUserModerationBadge(u);
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                      isSelected ? "bg-white/10" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {u.name}{" "}
                        <span className="ml-1 font-mono text-[10px] uppercase text-white/55">
                          [{u.role}]
                        </span>
                      </p>
                      <p className="truncate font-mono text-xs text-white/60">{u.email}</p>
                    </div>
                    <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase ${badge.tone}`}>
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="border-t border-white/10 p-3">
            <PaginationBar
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              label="users"
              onPageChange={setPage}
            />
          </div>
        </div>

        {/* Moderation Action Panel */}
        <div className="lg:col-span-5 border border-white/15 bg-white/[0.02] p-5">
          {!selectedUser ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
              <ShieldOff className="h-8 w-8 text-white/40" />
              <p className="mt-3 text-sm font-medium text-white">Select a User to Moderate</p>
              <p className="mt-1 text-xs text-white/60">
                Choose an account from the list to view its moderation status, suspend access, or reinstate it.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-white/15 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-white">{selectedUser.name}</h3>
                    <p className="font-mono text-xs text-white/65">{selectedUser.email}</p>
                  </div>
                  <span
                    className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${
                      getUserModerationBadge(selectedUser).tone
                    }`}
                  >
                    {getUserModerationBadge(selectedUser).label}
                  </span>
                </div>
              </div>

              {selectedUser.status === "SUSPENDED" && selectedUser.suspension && (
                <div className="border border-white/30 bg-white/[0.05] p-3.5 text-xs space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/75">
                    Active Suspension Details
                  </p>
                  <p className="text-white">
                    <span className="text-white/60">Type:</span>{" "}
                    {selectedUser.suspension.type === "PERMANENT" ? "Permanent" : "Temporary"}
                  </p>
                  <p className="text-white">
                    <span className="text-white/60">Suspended:</span>{" "}
                    {fmtDateTime(selectedUser.suspension.suspendedAt)}
                  </p>
                  <p className="text-white">
                    <span className="text-white/60">Expires:</span>{" "}
                    {selectedUser.suspension.type === "PERMANENT"
                      ? "Never (Manual reinstatement required)"
                      : fmtDateTime(selectedUser.suspension.expiresAt)}
                  </p>
                  <p className="text-white">
                    <span className="text-white/60">Reason:</span> {selectedUser.suspension.reason}
                  </p>
                  {selectedUser.suspension.suspendedByEmail && (
                    <p className="text-white">
                      <span className="text-white/60">Administrator:</span>{" "}
                      {selectedUser.suspension.suspendedByEmail}
                    </p>
                  )}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={submitting || selectedUser.id === currentAdminId}
                      onClick={() => handleReinstate(selectedUser)}
                      className="inline-flex w-full items-center justify-center gap-2 border border-white bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-white/90 disabled:opacity-50"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Remove Suspension / Reinstate Account
                    </button>
                  </div>
                </div>
              )}

              {selectedUser.id === currentAdminId ? (
                <p className="border border-white/20 bg-white/5 p-3 text-xs text-white/70">
                  Self-moderation is disabled for security.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/75">
                      Suspension Duration
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                      {(
                        [
                          { id: "1H", label: "1 Hour" },
                          { id: "24H", label: "24 Hours" },
                          { id: "7D", label: "1 Week" },
                          { id: "30D", label: "30 Days" },
                          { id: "PERMANENT", label: "Permanent" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDuration(opt.id)}
                          className={`border px-2 py-1.5 font-mono text-[10px] uppercase transition ${
                            duration === opt.id
                              ? "border-white bg-white text-navy font-semibold"
                              : "border-white/20 text-white/75 hover:border-white/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/75">
                      Reason for Suspension *
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Repeated spam, abuse, or policy violation"
                      className="w-full border border-white/20 bg-navy px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/75">
                      Internal Administrative Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Evidence or context for other administrators..."
                      className="w-full border border-white/20 bg-navy px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSuspend}
                    className="inline-flex w-full items-center justify-center gap-2 border border-white bg-white px-4 py-2.5 text-xs font-semibold text-navy hover:bg-white/90 disabled:opacity-50"
                  >
                    <UserX className="h-4 w-4" />
                    {duration === "PERMANENT" ? "Suspend Permanently" : `Suspend Account (${duration})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Suspension History View
// ─────────────────────────────────────────────────────────────────────────────
export function AdminSuspensionHistoryView({ onToast }: { onToast: ToastFn }) {
  const [logs, setLogs] = useState<ModerationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"" | "SUSPENDED" | "REINSTATED" | "AUTO_REINSTATED">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(action ? { action } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      const res = await apiFetch<{ logs: ModerationLogItem[] }>(`/api/admin/moderation-history?${qs.toString()}`);
      setLogs(res.data.logs);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to load suspension history");
    } finally {
      setLoading(false);
    }
  }, [page, action, search, onToast]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Suspension &amp; Moderation History</h2>
          <p className="mt-1 text-xs text-white/65">
            Immutable record of manual suspensions, manual reinstatements, and automatic expirations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder="Search user, reason, admin..."
            className="border border-white/20 bg-navy px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
          <select
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value as "" | "SUSPENDED" | "REINSTATED" | "AUTO_REINSTATED");
            }}
            className="border border-white/20 bg-navy px-2.5 py-1.5 text-xs text-white focus:border-white focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REINSTATED">Reinstated</option>
            <option value="AUTO_REINSTATED">Auto-Reinstated</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-xs text-white hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="border border-white/15 bg-white/[0.02]">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No moderation events yet"
            description="Suspensions and reinstatements will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/15 font-mono text-[10px] uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Administrator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-white/70">
                      {fmtDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{log.userName}</p>
                      <p className="font-mono text-[11px] text-white/55">{log.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="border border-white/30 bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-white/80">{log.durationType}</td>
                    <td className="max-w-xs px-4 py-3 text-white/85">{log.reason}</td>
                    <td className="px-4 py-3 font-mono text-white/65">{log.actorEmail ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-white/10 p-3">
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            label="moderation events"
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. User Activity & Suspicious Activity Views
// ─────────────────────────────────────────────────────────────────────────────
export function AdminUserActivityView({ onToast }: { onToast: ToastFn }) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0, totalPages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search.trim() ? { user: search.trim() } : {}),
        ...(actionFilter.trim() ? { action: actionFilter.trim() } : {}),
        ...(suspiciousOnly ? { suspiciousOnly: "true" } : {}),
      });
      const res = await apiFetch<{ logs: AuditLogItem[] }>(`/api/admin/audit-logs?${qs.toString()}`);
      setLogs(res.data.logs);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to load user activity");
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, suspiciousOnly, onToast]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, suspiciousOnly]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border border-white/15 bg-white/[0.02] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">User Activity Monitoring</h2>
          <p className="mt-1 text-xs text-white/65">
            Tracks logins, failed authentications, registrations, verifications, password changes, profile updates, and moderation events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder="Filter by user email..."
            className="border border-white/20 bg-navy px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
          <select
            value={actionFilter}
            onChange={(e) => {
              setPage(1);
              setActionFilter(e.target.value);
            }}
            className="border border-white/20 bg-navy px-2.5 py-1.5 text-xs text-white focus:border-white focus:outline-none"
          >
            <option value="">All Activity Types</option>
            <option value="auth.login_success">Successful Login</option>
            <option value="auth.login_failed">Failed Login</option>
            <option value="auth.register">Registration</option>
            <option value="auth.verify_email">Email Verification</option>
            <option value="auth.change_password">Password Change</option>
            <option value="auth.profile_updated">Profile Update</option>
            <option value="admin.user_suspended">Suspension</option>
            <option value="security.rbac_denied">Unauthorized Route Attempt</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSuspiciousOnly((v) => !v);
            }}
            className={`border px-3 py-1.5 font-mono text-[10px] uppercase ${
              suspiciousOnly ? "border-white bg-white text-navy font-semibold" : "border-white/25 text-white"
            }`}
          >
            Suspicious Only
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-xs text-white hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Apply
          </button>
        </div>
      </div>

      <div className="border border-white/15 bg-white/[0.02]">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState title="No activity found" description="Try clearing filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/15 font-mono text-[10px] uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-white/65">
                      {fmtDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-white">{item.actorEmail ?? "Anonymous"}</td>
                    <td className="px-4 py-3 font-mono text-white/90">{item.action}</td>
                    <td className="px-4 py-3">
                      <span className="border border-white/25 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
                        {item.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-white/60">{item.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-white/10 p-3">
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            label="moderation events"
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

export function AdminSuspiciousActivityView({ onToast }: { onToast: ToastFn }) {
  const [data, setData] = useState<SuspiciousActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<SuspiciousActivityData>("/api/admin/suspicious-activity");
      setData(res.data);
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to load suspicious activity");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border border-white/15 bg-white/[0.02] p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Suspicious Activity Detection</h2>
          <p className="mt-1 text-xs text-white/65">
            Flags repeated failed logins, lockouts, unauthorized admin access attempts, and spam triggers for administrator review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-xs text-white hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading || !data ? (
        <TableSkeleton rows={5} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Failed Logins (24h)", value: data.summary24h.failedLogins },
              { label: "Unauthorized Admin Attempts (24h)", value: data.summary24h.unauthorizedAdminAttempts },
              { label: "Account Lockouts (24h)", value: data.summary24h.accountLockouts },
              { label: "Suspended Accounts", value: data.summary24h.currentlySuspendedUsers },
            ].map((card) => (
              <div key={card.label} className="border border-white/15 bg-white/[0.02] p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="border border-white/15 bg-white/[0.02] p-4 text-xs text-white/75">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white">Active Thresholds:</span>{" "}
            Login Lockout after <strong>{data.thresholds.failedLoginLockoutThreshold}</strong> failed attempts ·
            OTP Lockout after <strong>{data.thresholds.otpMaxAttemptsThreshold}</strong> failed attempts ·
            Rate-limit window: <strong>{data.thresholds.windowMinutes} minutes</strong>.
          </div>

          <div className="border border-white/15 bg-white/[0.02]">
            {data.events.length === 0 ? (
              <EmptyState
                title="No suspicious events recorded"
                description="Your security perimeter has no flagged incidents."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/15 font-mono text-[10px] uppercase tracking-wider text-white/60">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Outcome</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-white/[0.03]">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-white/65">
                          {fmtDateTime(ev.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-white">{ev.action}</td>
                        <td className="px-4 py-3 font-mono text-white/80">{ev.outcome}</td>
                        <td className="px-4 py-3 font-mono text-white/75">{ev.actorEmail ?? "Unauthenticated"}</td>
                        <td className="px-4 py-3 font-mono text-white/60">{ev.ip ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Data Retention & Free-Plan MongoDB Optimization View
// ─────────────────────────────────────────────────────────────────────────────
export function AdminDataRetentionView({
  onToast,
  onConfirm,
}: {
  onToast: ToastFn;
  onConfirm: ConfirmFn;
}) {
  const [data, setData] = useState<RetentionOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const [emailDays, setEmailDays] = useState(30);
  const [auditDays, setAuditDays] = useState(90);
  const [activityDays, setActivityDays] = useState(60);
  const [autoCleanup, setAutoCleanup] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<RetentionOverviewData>("/api/admin/retention");
      setData(res.data);
      setEmailDays(res.data.retention.emailHistoryDays);
      setAuditDays(res.data.retention.auditLogDays);
      setActivityDays(res.data.retention.activityLogDays);
      setAutoCleanup(res.data.retention.autoCleanupEnabled);
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to load retention settings");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/admin/retention", {
        method: "PUT",
        body: JSON.stringify({
          emailHistoryDays: Number(emailDays),
          auditLogDays: Number(auditDays),
          activityLogDays: Number(activityDays),
          autoCleanupEnabled: autoCleanup,
        }),
      });
      onToast("success", "Retention policy saved.");
      await load();
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to save retention policy");
    } finally {
      setSaving(false);
    }
  };

  const handleRunCleanup = () => {
    onConfirm({
      title: "Run Automatic Retention Cleanup Now?",
      description:
        "Deletes expired Email History, non-critical Audit Logs, Moderation History older than your configured retention days, and expired sessions. User accounts, blogs, and projects are never deleted.",
      confirmLabel: "Run Cleanup",
      onConfirm: async () => {
        setRunning(true);
        try {
          const res = await apiFetch<{
            deletedEmailCampaigns: number;
            deletedAuditLogs: number;
            deletedModerationLogs: number;
            deletedExpiredSessions: number;
          }>("/api/admin/retention/run", { method: "POST" });
          onToast(
            "success",
            `Cleanup complete: ${res.data.deletedEmailCampaigns} emails, ${res.data.deletedAuditLogs} audit logs, ${res.data.deletedModerationLogs} moderation logs, ${res.data.deletedExpiredSessions} expired sessions removed.`,
          );
          await load();
        } catch (err) {
          onToast("error", err instanceof Error ? err.message : "Cleanup failed");
        } finally {
          setRunning(false);
        }
      },
    });
  };

  if (loading || !data) {
    return <TableSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Data Retention &amp; Database Optimization</h2>
          <p className="mt-1 text-xs text-white/65">
            Keep MongoDB storage lean on free plans with TTL auto-expiration and batch cleanup while preserving essential business data.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={handleRunCleanup}
          className="inline-flex items-center gap-2 border border-white bg-white px-4 py-2 text-xs font-semibold text-navy hover:bg-white/90 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Run Cleanup Now
        </button>
      </div>

      {/* Live Collection Counts */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Email History", value: data.collections.emailCampaigns },
          { label: "Audit Logs", value: data.collections.auditLogs },
          { label: "Moderation Logs", value: data.collections.moderationLogs },
          { label: "Active Sessions", value: data.collections.sessions },
          { label: "Suppressed Emails", value: data.collections.suppressedEmails },
          { label: "Users", value: data.collections.users },
          { label: "Blog Posts", value: data.collections.blogs },
          { label: "Projects", value: data.collections.projects },
          { label: "Contact Messages", value: data.collections.contactMessages },
        ].map((item) => (
          <div key={item.label} className="border border-white/15 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between text-white/60">
              <span className="font-mono text-[10px] uppercase">{item.label}</span>
              <Database className="h-3.5 w-3.5" />
            </div>
            <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Retention Form */}
      <form onSubmit={handleSave} className="border border-white/15 bg-white/[0.02] p-6 space-y-5">
        <h3 className="text-sm font-semibold text-white">Configurable Retention Periods (Days)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-white/70">
              Email History Retention (1–365 days)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={emailDays}
              onChange={(e) => setEmailDays(Number(e.target.value))}
              className="w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-white/70">
              Audit Logs Retention (7–365 days)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={auditDays}
              onChange={(e) => setAuditDays(Number(e.target.value))}
              className="w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-white/70">
              Moderation History Retention (7–365 days)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={activityDays}
              onChange={(e) => setActivityDays(Number(e.target.value))}
              className="w-full border border-white/20 bg-navy px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-xs text-white/85">
          <input
            type="checkbox"
            checked={autoCleanup}
            onChange={(e) => setAutoCleanup(e.target.checked)}
            className="h-4 w-4 accent-white"
          />
          Enable MongoDB TTL auto-expiration on newly created Email History and Audit Log records
        </label>

        <button
          type="submit"
          disabled={saving}
          className="border border-white bg-white px-5 py-2 text-xs font-semibold text-navy hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Retention Settings"}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Email Deliverability & DNS (SPF / DKIM / DMARC) Diagnostic View
// ─────────────────────────────────────────────────────────────────────────────
export function AdminEmailDeliverabilityView({ onToast }: { onToast: ToastFn }) {
  const [report, setReport] = useState<EmailDeliverabilityReport | null>(null);
  const [suppressions, setSuppressions] = useState<EmailSuppressionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, supRes] = await Promise.all([
        apiFetch<{ report: EmailDeliverabilityReport }>("/api/admin/email-deliverability"),
        apiFetch<{ suppressions: EmailSuppressionItem[] }>("/api/admin/email-deliverability/suppressions"),
      ]);
      setReport(repRes.data.report);
      setSuppressions(supRes.data.suppressions);
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to inspect email deliverability");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setSendingTest(true);
    try {
      const res = await apiFetch<{ note: string }>("/api/admin/email-deliverability/test", {
        method: "POST",
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      onToast("success", res.data.note);
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Test email failed");
    } finally {
      setSendingTest(false);
    }
  };

  const handleRemoveSuppression = async (id: string) => {
    try {
      await apiFetch(`/api/admin/email-deliverability/suppressions/${id}`, { method: "DELETE" });
      onToast("success", "Address removed from suppression list.");
      await load();
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Failed to remove suppression");
    }
  };

  if (loading || !report) {
    return <TableSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Email Deliverability &amp; Domain Authentication</h2>
          <p className="mt-1 text-xs text-white/65">
            Live SMTP transport verification, TLS status, SPF/DKIM/DMARC DNS inspection, and bounce suppression.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-xs text-white hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Re-check DNS &amp; SMTP
        </button>
      </div>

      {/* SMTP & DNS Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-white/15 bg-white/[0.02] p-5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">SMTP Transport</h3>
            <span className="border border-white/30 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
              {report.smtp.connectionVerified ? "Connected" : "Unverified"}
            </span>
          </div>
          <p className="text-white/75">Host: <span className="font-mono text-white">{report.smtp.host}:{report.smtp.port}</span></p>
          <p className="text-white/75">TLS Minimum: <span className="font-mono text-white">{report.smtp.tlsMinVersion}</span></p>
          <p className="text-white/75">From Address: <span className="font-mono text-white">{report.sender.fromAddress}</span></p>
          <p className="text-white/75">
            Domain Alignment ({report.sender.senderDomain || "—"} vs {report.sender.appDomain || "—"}):{" "}
            <strong className="text-white">{report.sender.domainAligned ? "Aligned" : "Not Aligned"}</strong>
          </p>
        </div>

        <div className="border border-white/15 bg-white/[0.02] p-5 space-y-2.5 text-xs">
          <h3 className="text-sm font-semibold text-white">DNS Authentication ({report.sender.senderDomain || "No domain"})</h3>
          <div className="space-y-1.5">
            <p className="text-white/80">
              <strong className="font-mono text-white">SPF:</strong> {report.dns.spf.status}
              {report.dns.spf.record && (
                <span className="mt-0.5 block truncate font-mono text-[11px] text-white/55">{report.dns.spf.record}</span>
              )}
            </p>
            <p className="text-white/80">
              <strong className="font-mono text-white">DKIM:</strong> {report.dns.dkim.status}
              {report.dns.dkim.selector && ` (selector: ${report.dns.dkim.selector})`}
            </p>
            <p className="text-white/80">
              <strong className="font-mono text-white">DMARC:</strong> {report.dns.dmarc.status}
              {report.dns.dmarc.record && (
                <span className="mt-0.5 block truncate font-mono text-[11px] text-white/55">{report.dns.dmarc.record}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations & Caveat */}
      <div className="border border-white/15 bg-white/[0.02] p-5 space-y-3 text-xs">
        <h3 className="text-sm font-semibold text-white">Deliverability Recommendations</h3>
        {report.recommendations.length === 0 ? (
          <p className="flex items-center gap-2 text-white">
            <CheckCircle2 className="h-4 w-4" /> All inspected DNS and SMTP alignment checks look healthy.
          </p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-5 text-white/80">
            {report.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        )}
        <p className="border-t border-white/10 pt-3 text-[11px] text-white/60">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
          {report.caveat}
        </p>
      </div>

      {/* Send Test Email */}
      <form onSubmit={handleSendTest} className="border border-white/15 bg-white/[0.02] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Send Live SMTP Diagnostic Email</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 border border-white/20 bg-navy px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={sendingTest}
            className="inline-flex items-center justify-center gap-2 border border-white bg-white px-4 py-2 text-xs font-semibold text-navy hover:bg-white/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> {sendingTest ? "Sending..." : "Send Test Email"}
          </button>
        </div>
      </form>

      {/* Bounce Suppression List */}
      <div className="border border-white/15 bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Bounce &amp; Failure Suppression ({report.suppression.suppressedCount} suppressed / {report.suppression.trackedBounceCount} tracked)
          </h3>
        </div>
        {suppressions.length === 0 ? (
          <p className="text-xs text-white/60">No bouncing or suppressed email addresses recorded.</p>
        ) : (
          <div className="divide-y divide-white/10 text-xs">
            {suppressions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-mono text-white">
                    {s.email}{" "}
                    <span className="ml-2 border border-white/25 px-1.5 py-0.5 text-[10px] uppercase">
                      {s.suppressed ? "SUPPRESSED" : `${s.failureCount} FAILURES`}
                    </span>
                  </p>
                  <p className="text-[11px] text-white/60">{s.lastErrorCategory} — {s.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveSuppression(s.id)}
                  className="border border-white/25 px-2.5 py-1 text-[11px] text-white hover:bg-white/10"
                >
                  Clear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
