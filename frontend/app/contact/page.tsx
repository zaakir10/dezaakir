import type { Metadata } from "next";
import { ArrowUpRight, Mail, MapPin } from "lucide-react";
import { MotionReveal } from "@/components/ui/MotionReveal";
import { ContactForm } from "@/features/contact/ContactForm";
import { fetchPublicSettings } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Dezaakir for software development projects, full-stack web engineering, consulting, or collaborations.",
  alternates: { canonical: `${siteConfig.url}/contact` },
};

export default async function ContactPage() {
  const settings = await fetchPublicSettings();
  const social = settings.socialLinks || {};

  const socialChannels = [
    {
      label: "GitHub",
      handle: "@zaakir10",
      href: social.github || "https://github.com/zaakir10",
    },
    ...(social.linkedin
      ? [
          {
            label: "LinkedIn",
            handle: "linkedin.com",
            href: social.linkedin,
          },
        ]
      : []),
    ...(social.x
      ? [
          {
            label: "X / Twitter",
            handle: "x.com",
            href: social.x,
          },
        ]
      : []),
    ...(social.facebook
      ? [
          {
            label: "Facebook",
            handle: "facebook.com",
            href: social.facebook,
          },
        ]
      : []),
    ...(social.tiktok
      ? [
          {
            label: "TikTok",
            handle: "tiktok.com",
            href: social.tiktok,
          },
        ]
      : []),
  ];

  return (
    <main className="bg-navy text-white">
      {/* Masthead */}
      <section className="bg-editorial-grid border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
            Direct Communication Channel
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-6xl">
            Let&apos;s Build Something Exceptional Together.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            Have a web application project, architectural question, or collaboration in mind? Send
            a direct message below or connect through my verified channels.
          </p>
        </div>
      </section>

      {/* Balanced Two-Column Contact Workspace */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Direct Details & Social Channels */}
          <div className="min-w-0 space-y-10 lg:col-span-5">
            <MotionReveal>
              <div className="border-t border-white/15 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  01 · Availability &amp; Details
                </p>

                <dl className="mt-6 divide-y divide-white/10 text-sm">
                  <div className="flex items-start gap-3.5 py-4">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                        Location
                      </dt>
                      <dd className="mt-1 font-semibold text-white">
                        {settings.location || "Remote · Global"}
                      </dd>
                    </div>
                  </div>

                  {social.email && (
                    <div className="flex items-start gap-3.5 py-4">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                          Direct Email
                        </dt>
                        <dd className="mt-1">
                          <a
                            href={`mailto:${social.email}`}
                            className="font-mono text-xs font-semibold text-white underline underline-offset-4 transition hover:opacity-80"
                          >
                            {social.email}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              <div className="mt-10 border-t border-white/15 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                  02 · Social Channels
                </p>

                <div className="mt-4 divide-y divide-white/10">
                  {socialChannels.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between py-4 text-sm transition hover:text-white"
                    >
                      <div>
                        <span className="font-bold text-white">{item.label}</span>
                        <span className="ml-2 font-mono text-xs text-white/45">
                          ({item.handle})
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-white/65 transition group-hover:translate-x-0.5 group-hover:text-white">
                        <span>Connect</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </MotionReveal>
          </div>

          {/* Right Column: Validated Contact Form */}
          <div className="min-w-0 lg:col-span-7">
            <MotionReveal delay={0.08}>
              <ContactForm />
            </MotionReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
