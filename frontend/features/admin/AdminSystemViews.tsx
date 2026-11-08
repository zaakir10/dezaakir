"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Mail,
  Plus,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import {
  BarChartCard,
  EmptyState,
  PaginationBar,
  TableSkeleton,
} from "@/features/admin/AdminUI";
import type {
  AdminOverviewData,
  AuditLogItem,
  BlogArticle,
  ImageRef,
  PaginationMeta,
  ProjectItem,
  SiteSettingsData,
} from "@/types";

export function AdminAnalyticsView({
  overview,
  blogs,
  projects,
}: {
  overview: AdminOverviewData | null;
  blogs: BlogArticle[];
  projects: ProjectItem[];
}) {
  const series = overview?.monthlySeries ?? [];
  const stats = overview?.stats;
  const comparisons = overview?.comparisons;

  const formatDelta = (comp?: { last30Days: number; prev30Days: number }) => {
    if (!comp) return "No historical baseline";
    const diff = comp.last30Days - comp.prev30Days;
    if (diff === 0) return `${comp.last30Days} in last 30d (unchanged vs prior 30d)`;
    const sign = diff > 0 ? "+" : "";
    return `${comp.last30Days} in last 30d (${sign}${diff} vs prior 30d)`;
  };

  const totalReadingTime = blogs.reduce((acc, b) => acc + (b.readingTime || 1), 0);
  const avgReadingTime = blogs.length > 0 ? Math.round(totalReadingTime / blogs.length) : 0;

  return (
    <div className="space-y-6">
      <div className="border border-white/15 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
              Platform Telemetry & Historical Trends
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              Real-Time Database Analytics (6-Month Window)
            </h2>
          </div>
          <span className="border border-white/25 bg-white/5 px-3 py-1 font-mono text-[11px] text-white">
            Source: Live MongoDB Aggregations
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-white/15 bg-navy p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              Blog Publishing Velocity
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {stats?.blogs.published ?? 0}{" "}
              <span className="text-xs font-normal text-white/55">
                / {stats?.blogs.total ?? 0} total
              </span>
            </p>
            <p className="mt-1.5 text-[11px] text-white/65">
              {formatDelta(comparisons?.blogsPublished)}
            </p>
          </div>

          <div className="border border-white/15 bg-navy p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              Project Portfolio Output
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {stats?.projects.published ?? 0}{" "}
              <span className="text-xs font-normal text-white/55">
                / {stats?.projects.total ?? 0} total
              </span>
            </p>
            <p className="mt-1.5 text-[11px] text-white/65">
              {formatDelta(comparisons?.projectsCreated)}
            </p>
          </div>

          <div className="border border-white/15 bg-navy p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              User Registrations
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {stats?.users.total ?? 0}{" "}
              <span className="text-xs font-normal text-white/55">
                ({stats?.users.active ?? 0} active)
              </span>
            </p>
            <p className="mt-1.5 text-[11px] text-white/65">
              {formatDelta(comparisons?.usersRegistered)}
            </p>
          </div>

          <div className="border border-white/15 bg-navy p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              Avg. Article Reading Time
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {avgReadingTime} min{" "}
              <span className="text-xs font-normal text-white/55">
                ({totalReadingTime} min total)
              </span>
            </p>
            <p className="mt-1.5 text-[11px] text-white/65">
              Calculated across {blogs.length} articles
            </p>
          </div>
        </div>
      </div>

      {series.length === 0 ? (
        <EmptyState
          title="No historical time-series data yet"
          description="As blog posts, projects, users, and contact inquiries are recorded, 6-month charts will populate automatically."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <BarChartCard
            title="Blog Publishing Activity"
            subtitle="Monthly articles created vs published over the last 6 months"
            primaryLabel="Created"
            secondaryLabel="Published"
            data={series.map((s) => ({
              label: s.label,
              primary: s.blogsTotal,
              secondary: s.blogsPublished,
            }))}
          />

          <BarChartCard
            title="Monthly Content Creation"
            subtitle="Combined blog posts and portfolio projects authored per month"
            primaryLabel="Total Content Items"
            secondaryLabel="Published Items"
            data={series.map((s) => ({
              label: s.label,
              primary: s.blogsTotal + s.projectsTotal,
              secondary: s.blogsPublished + s.projectsPublished,
            }))}
          />

          <BarChartCard
            title="Project Publishing Activity"
            subtitle="Monthly engineering projects added and published"
            primaryLabel="Created"
            secondaryLabel="Published"
            data={series.map((s) => ({
              label: s.label,
              primary: s.projectsTotal,
              secondary: s.projectsPublished,
            }))}
          />

          <BarChartCard
            title="User Registration & Inquiry Trends"
            subtitle="New registered accounts and contact messages received by month"
            primaryLabel="New Users"
            secondaryLabel="Contact Messages"
            data={series.map((s) => ({
              label: s.label,
              primary: s.usersRegistered,
              secondary: s.messagesReceived,
            }))}
          />
        </div>
      )}

      <div className="border border-white/15 bg-white/[0.02] p-5">
        <h3 className="text-sm font-bold text-white">Top Engineering Technologies in Portfolio</h3>
        <p className="mt-0.5 text-xs text-white/60">
          Aggregated from {projects.length} portfolio projects in MongoDB
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(
            projects.reduce<Record<string, number>>((acc, proj) => {
              for (const tech of proj.technologies || []) {
                acc[tech] = (acc[tech] || 0) + 1;
              }
              return acc;
            }, {})
          )
            .sort((a, b) => b[1] - a[1])
            .map(([tech, count]) => (
              <div
                key={tech}
                className="flex items-center gap-2 border border-white/20 bg-navy px-3 py-1.5 text-xs"
              >
                <span className="font-medium text-white">{tech}</span>
                <span className="bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-navy">
                  {count}
                </span>
              </div>
            ))}
          {projects.length === 0 && (
            <span className="text-xs text-white/50">No project technologies recorded yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminSiteSettingsView({
  settings,
  setSettings,
  systemStatus,
  saving,
  onSave,
  onOpenMediaPicker,
}: {
  settings: SiteSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettingsData | null>>;
  systemStatus?: AdminOverviewData["systemStatus"];
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onOpenMediaPicker: (target: "profile" | "og") => void;
}) {
  const [subTab, setSubTab] = useState<
    "general" | "profile" | "social" | "system" | "appearance"
  >("general");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Full-Stack & Backend");
  const [newInterest, setNewInterest] = useState("");

  const addSkill = () => {
    if (!newSkillName.trim()) return;
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            skills: [
              ...(prev.skills || []),
              { name: newSkillName.trim(), category: newSkillCategory.trim() || "General" },
            ],
          }
        : prev
    );
    setNewSkillName("");
  };

  const removeSkill = (idx: number) => {
    setSettings((prev) =>
      prev ? { ...prev, skills: prev.skills.filter((_, i) => i !== idx) } : prev
    );
  };

  const addCareerInterest = () => {
    if (!newInterest.trim()) return;
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            careerInterests: [...(prev.careerInterests || []), newInterest.trim()],
          }
        : prev
    );
    setNewInterest("");
  };

  const removeCareerInterest = (idx: number) => {
    setSettings((prev) =>
      prev
        ? { ...prev, careerInterests: prev.careerInterests.filter((_, i) => i !== idx) }
        : prev
    );
  };

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["general", "General"],
              ["profile", "Author & Biography"],
              ["social", "Social & Contact"],
              ["system", "Email & Storage Status"],
              ["appearance", "Brand & Appearance"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                subTab === key
                  ? "bg-white text-navy"
                  : "border border-white/15 text-white/75 hover:border-white hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-white px-5 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Saving Settings..." : "Save Site Settings"}
        </button>
      </div>

      {subTab === "general" && (
        <div className="space-y-5 border border-white/15 bg-white/[0.02] p-6">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white">General Website Identity</h3>
            <p className="mt-0.5 text-xs text-white/60">
              Configure core platform title, tagline, hero headline, and downloadable CV path.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                Website Name
              </label>
              <input
                type="text"
                required
                value={settings.siteTitle}
                onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                Brand Tagline
              </label>
              <input
                type="text"
                required
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                Location
              </label>
              <input
                type="text"
                value={settings.location || ""}
                onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                placeholder="Mogadishu, Somalia / Remote"
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                CV / Resume URL or Path
              </label>
              <input
                type="text"
                value={settings.cvUrl || ""}
                onChange={(e) => setSettings({ ...settings, cvUrl: e.target.value })}
                placeholder="/cv.pdf or https://..."
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
              Homepage Hero Headline
            </label>
            <input
              type="text"
              required
              value={settings.heroTitle}
              onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
              className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
              Homepage Hero Description
            </label>
            <textarea
              rows={3}
              required
              value={settings.heroDescription}
              onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })}
              className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {subTab === "profile" && (
        <div className="space-y-6 border border-white/15 bg-white/[0.02] p-6">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white">Author Profile & Engineering Biography</h3>
            <p className="mt-0.5 text-xs text-white/60">
              Manage author name, portrait image, biography, skills, and career interests displayed on the About page.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                Profile Portrait Image
              </label>
              <div className="border border-white/20 bg-navy p-4">
                {settings.profileImage?.url ? (
                  <div className="space-y-3">
                    <div className="relative aspect-square w-full overflow-hidden border border-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.profileImage.url}
                        alt={settings.profileImage.alt || "Author Portrait"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenMediaPicker("profile")}
                        className="flex-1 border border-white/25 py-1.5 text-xs font-semibold text-white uppercase hover:border-white"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, profileImage: undefined })}
                        className="border border-white/25 px-3 py-1.5 text-xs text-white/75 hover:border-white hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenMediaPicker("profile")}
                    className="flex aspect-square w-full flex-col items-center justify-center border border-dashed border-white/25 p-4 text-center transition hover:border-white"
                  >
                    <ImageIcon className="h-6 w-6 text-white/70" />
                    <span className="mt-2 text-xs font-semibold text-white">
                      Select or Upload Portrait
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                  Author Full Name
                </label>
                <input
                  type="text"
                  value={settings.authorName || "Zaakir"}
                  onChange={(e) => setSettings({ ...settings, authorName: e.target.value })}
                  className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                  Detailed Biography
                </label>
                <textarea
                  rows={7}
                  required
                  value={settings.biography}
                  onChange={(e) => setSettings({ ...settings, biography: e.target.value })}
                  className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm leading-relaxed text-white focus:border-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-t border-white/15 pt-6 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-bold tracking-wider text-white uppercase">
                Technical Skills ({settings.skills?.length || 0})
              </h4>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Skill (e.g. TypeScript)"
                  className="flex-1 border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                />
                <input
                  type="text"
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  placeholder="Category"
                  className="w-40 border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="bg-white px-3 py-2 text-xs font-bold text-navy uppercase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                {(settings.skills || []).map((skill, idx) => (
                  <span
                    key={`${skill.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 border border-white/20 bg-navy px-2.5 py-1 text-xs text-white"
                  >
                    <span>{skill.name}</span>
                    <span className="font-mono text-[10px] text-white/50">({skill.category})</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(idx)}
                      className="text-white/60 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold tracking-wider text-white uppercase">
                Career Focus & Research Interests ({settings.careerInterests?.length || 0})
              </h4>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="e.g. Distributed Systems & Applied AI"
                  className="flex-1 border border-white/25 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCareerInterest}
                  className="bg-white px-3 py-2 text-xs font-bold text-navy uppercase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(settings.careerInterests || []).map((interest, idx) => (
                  <span
                    key={`${interest}-${idx}`}
                    className="inline-flex items-center gap-1.5 border border-white/20 bg-navy px-2.5 py-1 text-xs text-white"
                  >
                    <span>{interest}</span>
                    <button
                      type="button"
                      onClick={() => removeCareerInterest(idx)}
                      className="text-white/60 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "social" && (
        <div className="space-y-5 border border-white/15 bg-white/[0.02] p-6">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white">Social Media & Direct Contact Channels</h3>
            <p className="mt-0.5 text-xs text-white/60">
              All external links must use HTTPS. Leave any unused social channel blank.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                Public Contact Email
              </label>
              <input
                type="email"
                value={settings.socialLinks?.email || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, email: e.target.value },
                  })
                }
                placeholder="contact@dezaakir.com"
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                GitHub Profile URL
              </label>
              <input
                type="url"
                value={settings.socialLinks?.github || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, github: e.target.value },
                  })
                }
                placeholder="https://github.com/..."
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                Facebook URL
              </label>
              <input
                type="url"
                value={settings.socialLinks?.facebook || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, facebook: e.target.value },
                  })
                }
                placeholder="https://facebook.com/..."
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                TikTok URL
              </label>
              <input
                type="url"
                value={settings.socialLinks?.tiktok || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, tiktok: e.target.value },
                  })
                }
                placeholder="https://tiktok.com/@..."
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={settings.socialLinks?.linkedin || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, linkedin: e.target.value },
                  })
                }
                placeholder="https://linkedin.com/in/..."
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                X (Twitter) URL
              </label>
              <input
                type="url"
                value={settings.socialLinks?.x || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, x: e.target.value },
                  })
                }
                placeholder="https://x.com/..."
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                YouTube Channel URL
              </label>
              <input
                type="url"
                value={settings.socialLinks?.youtube || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, youtube: e.target.value },
                  })
                }
                placeholder="https://youtube.com/@..."
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
                Primary Website URL
              </label>
              <input
                type="url"
                value={settings.socialLinks?.website || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, website: e.target.value },
                  })
                }
                placeholder="https://dezaakir.com"
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {subTab === "system" && (
        <div className="space-y-4 border border-white/15 bg-white/[0.02] p-6">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white">
              Email & Cloud Media Storage Diagnostics
            </h3>
            <p className="mt-0.5 text-xs text-white/60">
              Live server configuration status. Sensitive credentials and API keys remain strictly server-side in environment variables.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-white/15 bg-navy p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  SMTP Email Delivery
                </span>
                <Mail className="h-4 w-4 text-white/75" />
              </div>
              <p className="mt-2 font-mono text-sm font-bold text-white">
                {systemStatus?.emailConfigured ? "CONNECTED" : "DEVELOPMENT LOG MODE"}
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-white/60">
                Sender: {systemStatus?.emailFrom || "noreply@dezaakir.com"}
              </p>
            </div>

            <div className="border border-white/15 bg-navy p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Cloudinary Media CDN
                </span>
                <ImageIcon className="h-4 w-4 text-white/75" />
              </div>
              <p className="mt-2 font-mono text-sm font-bold text-white">
                {systemStatus?.cloudinaryConfigured ? "CONFIGURED" : "LOCAL / FALLBACK"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-white/60">
                Cloud: {systemStatus?.cloudinaryCloudName || "Not set"}
              </p>
            </div>

            <div className="border border-white/15 bg-navy p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Runtime & Security Posture
                </span>
                <Server className="h-4 w-4 text-white/75" />
              </div>
              <p className="mt-2 font-mono text-sm font-bold text-white uppercase">
                {systemStatus?.environment || "development"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-white/60">
                HttpOnly Session + CSRF + RBAC Active
              </p>
            </div>
          </div>
        </div>
      )}

      {subTab === "appearance" && (
        <div className="space-y-5 border border-white/15 bg-white/[0.02] p-6">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white">
              Dezaakir Brand Identity & Visual System
            </h3>
            <p className="mt-0.5 text-xs text-white/60">
              Strict monochrome architectural palette enforced across all public and administrative views.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center gap-5 border border-white/20 bg-navy p-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-white/20 bg-white/5 p-3">
                <Image
                  src="/logo.png"
                  alt="Dezaakir Official Logo"
                  width={56}
                  height={56}
                  className="h-14 w-auto object-contain"
                />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                  Official Brand Mark
                </span>
                <h4 className="mt-1 text-base font-bold text-white">Dezaakir Original Emblem</h4>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  Served from <code className="font-mono text-white">/logo.png</code> with original proportions preserved.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col justify-between border border-white/25 bg-navy p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Primary Surface
                </span>
                <div className="mt-6">
                  <p className="font-bold text-white">Navy Blue</p>
                  <p className="font-mono text-xs text-white/80">#0B1628</p>
                </div>
              </div>
              <div className="flex flex-col justify-between border border-white bg-white p-4 text-navy">
                <span className="font-mono text-[10px] uppercase tracking-wider text-navy/70">
                  Primary Contrast
                </span>
                <div className="mt-6">
                  <p className="font-bold text-navy">Pure White</p>
                  <p className="font-mono text-xs text-navy/80">#FFFFFF</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export function AdminSeoSettingsView({
  settings,
  setSettings,
  blogs,
  projects,
  saving,
  onSave,
  onOpenMediaPicker,
  onEditBlog,
  onEditProject,
}: {
  settings: SiteSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettingsData | null>>;
  blogs: BlogArticle[];
  projects: ProjectItem[];
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onOpenMediaPicker: (target: "profile" | "og") => void;
  onEditBlog: (blog: BlogArticle) => void;
  onEditProject: (project: ProjectItem) => void;
}) {
  return (
    <div className="space-y-6">
      <form onSubmit={onSave} className="space-y-5 border border-white/15 bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Global Search Engine Optimization (SEO) & OpenGraph
            </h3>
            <p className="mt-0.5 text-xs text-white/60">
              Default metadata fallback used when individual pages or articles do not specify custom SEO overrides.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-white px-5 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90 disabled:opacity-50"
          >
            {saving ? "Saving SEO..." : "Save SEO Configuration"}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                  Default Meta Title
                </label>
                <span className="font-mono text-[10px] text-white/50">
                  {(settings.seo?.defaultTitle || "").length} / 70 chars
                </span>
              </div>
              <input
                type="text"
                required
                value={settings.seo?.defaultTitle || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, defaultTitle: e.target.value },
                  })
                }
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                  Default Meta Description
                </label>
                <span className="font-mono text-[10px] text-white/50">
                  {(settings.seo?.defaultDescription || "").length} / 160 chars
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={settings.seo?.defaultDescription || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, defaultDescription: e.target.value },
                  })
                }
                className="w-full border border-white/25 bg-navy px-3.5 py-2.5 text-sm text-white focus:border-white focus:outline-none"
              />
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border border-white/20 bg-navy px-4 py-3 text-xs text-white transition hover:border-white"
              >
                <div>
                  <p className="font-bold uppercase">XML Sitemap</p>
                  <p className="mt-0.5 font-mono text-[10px] text-white/60">/sitemap.xml (Dynamic)</p>
                </div>
                <ExternalLink className="h-4 w-4 text-white/70" />
              </a>

              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border border-white/20 bg-navy px-4 py-3 text-xs text-white transition hover:border-white"
              >
                <div>
                  <p className="font-bold uppercase">Robots Indexing Policy</p>
                  <p className="mt-0.5 font-mono text-[10px] text-white/60">/robots.txt (Disallows /admin)</p>
                </div>
                <ExternalLink className="h-4 w-4 text-white/70" />
              </a>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/70">
              Default OpenGraph Social Image
            </label>
            <div className="border border-white/20 bg-navy p-4">
              {settings.seo?.ogImage?.url ? (
                <div className="space-y-3">
                  <div className="relative aspect-video w-full overflow-hidden border border-white/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.seo.ogImage.url}
                      alt={settings.seo.ogImage.alt || "OpenGraph Image"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenMediaPicker("og")}
                      className="flex-1 border border-white/25 py-1.5 text-xs font-semibold text-white uppercase hover:border-white"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          seo: { ...settings.seo, ogImage: undefined },
                        })
                      }
                      className="border border-white/25 px-3 py-1.5 text-xs text-white/75 hover:border-white hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenMediaPicker("og")}
                  className="flex aspect-video w-full flex-col items-center justify-center border border-dashed border-white/25 p-4 text-center transition hover:border-white"
                >
                  <Globe className="h-6 w-6 text-white/70" />
                  <span className="mt-2 text-xs font-semibold text-white">
                    Select OpenGraph Image
                  </span>
                  <span className="mt-1 font-mono text-[10px] text-white/50">1200 × 630px recommended</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      <div className="border border-white/15 bg-white/[0.02] p-6">
        <h3 className="text-sm font-bold text-white">
          Content SEO Readiness Audit ({blogs.length} Blogs · {projects.length} Projects)
        </h3>
        <p className="mt-0.5 text-xs text-white/60">
          Inspect custom SEO titles, meta descriptions, and social cover images across all published and draft content.
        </p>

        <div className="mt-4 overflow-x-auto border border-white/15">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
              <tr>
                <th className="px-4 py-3">Content Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">SEO Title</th>
                <th className="px-4 py-3">SEO Description</th>
                <th className="px-4 py-3">Cover Image</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {blogs.slice(0, 8).map((b) => (
                <tr key={`seo-blog-${b.id}`} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{b.title}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-white/70">BLOG</td>
                  <td className="px-4 py-3">
                    <span className="border border-white/20 px-2 py-0.5 font-mono text-[10px]">
                      {b.seoTitle ? "Custom" : "Fallback"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-white/20 px-2 py-0.5 font-mono text-[10px]">
                      {b.seoDescription ? "Custom" : "Excerpt"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] ${
                        b.coverImage?.url ? "bg-white text-navy font-bold" : "border border-white/20 text-white/60"
                      }`}
                    >
                      {b.coverImage?.url ? "Ready" : "Missing"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEditBlog(b)}
                      className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
              {projects.slice(0, 8).map((p) => (
                <tr key={`seo-proj-${p.id}`} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-white/70">PROJECT</td>
                  <td className="px-4 py-3">
                    <span className="border border-white/20 px-2 py-0.5 font-mono text-[10px]">
                      {p.seoTitle ? "Custom" : "Fallback"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-white/20 px-2 py-0.5 font-mono text-[10px]">
                      {p.seoDescription ? "Custom" : "Summary"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] ${
                        p.coverImage?.url ? "bg-white text-navy font-bold" : "border border-white/20 text-white/60"
                      }`}
                    >
                      {p.coverImage?.url ? "Ready" : "Missing"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEditProject(p)}
                      className="border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white uppercase hover:border-white"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminAuditLogsView({
  logs,
  meta,
  loading,
  categoryFilter,
  setCategoryFilter,
  outcomeFilter,
  setOutcomeFilter,
  actionSearch,
  setActionSearch,
  onSearch,
  onPageChange,
}: {
  logs: AuditLogItem[];
  meta: PaginationMeta;
  loading: boolean;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  outcomeFilter: string;
  setOutcomeFilter: (v: string) => void;
  actionSearch: string;
  setActionSearch: (v: string) => void;
  onSearch: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.02] p-4">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-white/50" />
            <input
              type="text"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              placeholder="Filter by action code (e.g. BLOG_CREATE, AUTH_LOGIN_SUCCESS)..."
              className="w-full border border-white/20 bg-navy py-2 pr-3 pl-8 text-xs text-white focus:border-white focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="ADMIN">ADMIN</option>
            <option value="AUTH">AUTH</option>
            <option value="SECURITY">SECURITY</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="border border-white/20 bg-navy px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="DENIED">DENIED</option>
          </select>

          <button
            type="button"
            onClick={onSearch}
            className="bg-white px-4 py-2 text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-white/90"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={7} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No matching audit events"
          description="No security or administrative events matched your current filter criteria."
        />
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap text-white/65">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-white/20 px-2 py-0.5 text-[10px] text-white">
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{log.action}</td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-white/80">{log.actorEmail || "system"}</td>
                  <td className="px-4 py-3 text-white/65">
                    {log.targetType ? `${log.targetType}${log.targetId ? `:${log.targetId.slice(-6)}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/55">{log.ip || "—"}</td>
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
        label="audit events"
        onPageChange={onPageChange}
      />
    </div>
  );
}
