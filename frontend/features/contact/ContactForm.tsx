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
      className="space-y-6 rounded-xl border border-white/20 bg-white/[0.03] p-6 sm:p-8"
    >
      {serverSuccess && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md border border-white bg-white/10 p-4 text-sm text-white"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverSuccess}</span>
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-white bg-white/5 p-4 text-sm text-white"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Hidden Honeypot Field for Automated Spam Protection */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block font-mono text-xs font-medium text-white uppercase">
            Full Name
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            {...register("name")}
            className="mt-2 w-full rounded-md border border-white/25 bg-navy px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white"
          />
          {errors.name && <p className="mt-1.5 text-xs text-white/80">· {errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="contact-email" className="block font-mono text-xs font-medium text-white uppercase">
            Email Address
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            className="mt-2 w-full rounded-md border border-white/25 bg-navy px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white"
          />
          {errors.email && <p className="mt-1.5 text-xs text-white/80">· {errors.email.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block font-mono text-xs font-medium text-white uppercase">
          Subject
        </label>
        <input
          id="contact-subject"
          type="text"
          placeholder="Project inquiry, collaboration, or technical question"
          {...register("subject")}
          className="mt-2 w-full rounded-md border border-white/25 bg-navy px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white"
        />
        {errors.subject && <p className="mt-1.5 text-xs text-white/80">· {errors.subject.message}</p>}
      </div>

      <div>
        <label htmlFor="contact-message" className="block font-mono text-xs font-medium text-white uppercase">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={6}
          placeholder="Describe your project, timeline, or question..."
          {...register("message")}
          className="mt-2 w-full rounded-md border border-white/25 bg-navy px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white"
        />
        {errors.message && <p className="mt-1.5 text-xs text-white/80">· {errors.message.message}</p>}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="font-mono text-xs text-white/60">Protected by rate limiting & input validation</p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-white/90 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}
