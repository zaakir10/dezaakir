"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api";

const ContactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(254),
  subject: z
    .string()
    .trim()
    .min(2, "Subject must be at least 2 characters")
    .max(150, "Subject is too long")
    .regex(/^[^\r\n]*$/, "Subject must not contain line breaks"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be at most 5000 characters"),
  website: z.string().max(200).optional(),
});

type ContactFormValues = z.infer<typeof ContactSchema>;

export function ContactForm() {
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      website: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setServerError(null);
    setServerSuccess(null);
    try {
      const { data } = await apiRequest<{ message: string }>("/api/contact", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setServerSuccess(data.message);
      reset();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to send message right now. Please try again later.");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6 border border-white/20 bg-white/[0.015] p-6 sm:p-10"
    >
      <div className="border-b border-white/15 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Direct Inquiry
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">Send a Message</h2>
      </div>

      {serverSuccess && (
        <div
          role="status"
          className="flex items-start gap-3 border border-white bg-white px-4 py-3.5 text-sm font-medium text-navy"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverSuccess}</span>
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-3 border border-white bg-white/10 px-4 py-3.5 text-sm text-white"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Hidden Honeypot Field for Automated Spam Protection */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75"
          >
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
            className="mt-2 w-full border border-white/25 bg-navy px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1.5 font-mono text-xs text-white/85">· {errors.name.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75"
          >
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
            className="mt-2 w-full border border-white/25 bg-navy px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1.5 font-mono text-xs text-white/85">· {errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-subject"
          className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75"
        >
          Subject
        </label>
        <input
          id="contact-subject"
          type="text"
          placeholder="Project inquiry, collaboration, or technical question"
          aria-invalid={Boolean(errors.subject)}
          {...register("subject")}
          className="mt-2 w-full border border-white/25 bg-navy px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none"
        />
        {errors.subject && (
          <p className="mt-1.5 font-mono text-xs text-white/85">· {errors.subject.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          rows={6}
          placeholder="Tell me about your project, goals, or question..."
          aria-invalid={Boolean(errors.message)}
          {...register("message")}
          className="mt-2 w-full border border-white/25 bg-navy px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/40 focus:border-white focus:outline-none"
        />
        {errors.message && (
          <p className="mt-1.5 font-mono text-xs text-white/85">· {errors.message.message}</p>
        )}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 border-t border-white/15 pt-5 sm:flex-row sm:items-center">
        <p className="font-mono text-[11px] text-white/55">
          Validated &amp; rate-limited direct delivery
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 bg-white px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-navy transition hover:bg-white/90 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isSubmitting ? "Sending..." : "Send Message"}</span>
        </button>
      </div>
    </form>
  );
}
