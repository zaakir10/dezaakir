import type { Metadata } from "next";
import { Mail, MapPin, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/features/contact/ContactForm";
import { fetchPublicSettings } from "@/lib/api";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a direct message to Dezaakir for software development projects, consulting, or collaborations.",
};

export default async function ContactPage() {
  const settings = await fetchPublicSettings();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-mono text-xs tracking-widest text-white/60 uppercase">Direct Channel</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Contact Dezaakir</h1>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            Whether you are building a full-stack application, integrating AI capabilities, or looking for a security-minded
            engineer, feel free to reach out.
          </p>

          <div className="mt-8 space-y-5 border-t border-white/15 pt-8 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-white/70" />
              <div>
                <p className="font-mono text-xs text-white/60 uppercase">Location</p>
                <p className="mt-0.5 text-white">{settings.location || "Remote · Global"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-white/70" />
              <div>
                <p className="font-mono text-xs text-white/60 uppercase">Inquiries</p>
                <p className="mt-0.5 text-white">Direct delivery to the Dezaakir Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-white/70" />
              <div>
                <p className="font-mono text-xs text-white/60 uppercase">Security</p>
                <p className="mt-0.5 text-white/80">
                  Validated with Zod schemas, rate-limited against spam, and stored securely in MongoDB.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
