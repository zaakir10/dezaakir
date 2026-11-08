import type { Metadata } from "next";
import { ArrowUpRight, Mail, MapPin, ShieldCheck, Terminal } from "lucide-react";
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
      handle: "github.com",
      href: social.github || "https://github.com/dezaakir",
    },
    {
      label: "Facebook",
      handle: "facebook.com",
      href: social.facebook || "https://facebook.com/dezaakir",
    },
    {
      label: "TikTok",
      handle: "tiktok.com",
      href: social.tiktok || "https://tiktok.com/@dezaakir",
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
  ];

  return (
    <main className="bg-navy text-white">
      {/* Masthead */}
      <section className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 border border-white/20 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80">
            <Terminal className="h-3.5 w-3.5 text-white" />
            <span>Direct Communication Channel</span>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Let&apos;s Build Something Exceptional Together.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            Have a web application project, architectural question, or collaboration in mind? Send
            a direct message below or connect through my social channels.
          </p>
        </div>
      </section>

      {/* Main Split Contact Workspace */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Left Column: Direct Details & Social Channels */}
          <div className="space-y-8 lg:col-span-5">
            <div className="border border-white/15 bg-white/[0.02] p-6 sm:p-8">
              <h2 className="border-b border-white/10 pb-3 font-mono text-xs font-bold uppercase tracking-widest text-white">
                Contact Information
              </h2>

              <div className="mt-6 space-y-5 text-sm">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/20 bg-navy">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                      Location
                    </p>
                    <p className="mt-0.5 font-semibold text-white">
                      {settings.location || "Remote · Global"}
                    </p>
                  </div>
                </div>

                {social.email && (
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/20 bg-navy">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                        Direct Email
                      </p>
                      <a
                        href={`mailto:${social.email}`}
                        className="mt-0.5 block font-mono text-xs font-semibold text-white underline underline-offset-4"
                      >
                        {social.email}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/20 bg-navy">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                      Protected Delivery
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/75">
                      Every submission is validated, rate-limited against automated spam, and
                      delivered straight to the Dezaakir Administration Console.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Contact Links */}
            <div className="border border-white/15 bg-white/[0.02] p-6 sm:p-8">
              <h2 className="border-b border-white/10 pb-3 font-mono text-xs font-bold uppercase tracking-widest text-white">
                Social Channels
              </h2>

              <div className="mt-5 divide-y divide-white/10">
                {socialChannels.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between py-3.5 text-sm transition hover:text-white"
                  >
                    <div>
                      <span className="font-bold text-white">{item.label}</span>
                      <span className="ml-2 font-mono text-xs text-white/50">
                        ({item.handle})
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white">
                      <span>Connect</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
