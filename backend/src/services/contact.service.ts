import type { Request } from "express";
import { ContactMessage } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import type { PaginationMeta } from "../utils/apiResponse.js";
import { hashToken } from "../utils/crypto.js";
import { escapeRegex, normalizePage, toObjectId, trusted } from "../utils/query.js";
import { sanitizePlainText } from "../utils/sanitizeHtml.js";
import type {
  ContactSubmissionInput,
  ListMessagesQuery,
  UpdateMessageStatusInput,
} from "../validators/contact.validator.js";
import { recordAudit } from "./audit.service.js";

const GENERIC_SUCCESS_MESSAGE = "Thank you for your message. I will get back to you soon.";

export async function submitContactMessage(
  input: ContactSubmissionInput,
  req?: Request,
): Promise<{ message: string }> {
  // Honeypot spam protection: if the hidden `website` field is populated, drop silently.
  if (input.website && input.website.trim().length > 0) {
    await recordAudit({
      category: "SECURITY",
      action: "security.contact_honeypot_triggered",
      outcome: "DENIED",
      actorEmail: input.email,
      req,
    });
    return { message: GENERIC_SUCCESS_MESSAGE };
  }

  const name = sanitizePlainText(input.name);
  const subject = sanitizePlainText(input.subject);
  const message = sanitizePlainText(input.message);
  const ipHash = req?.ip ? hashToken(req.ip, "ip") : undefined;
  const userAgent = req?.get("user-agent")?.slice(0, 300);

  const created = await ContactMessage.create({
    name,
    email: input.email,
    subject,
    message,
    status: "NEW",
    ...(ipHash ? { ipHash } : {}),
    ...(userAgent ? { userAgent } : {}),
  });

  await recordAudit({
    category: "SYSTEM",
    action: "contact.submit",
    outcome: "SUCCESS",
    actorEmail: input.email,
    targetType: "ContactMessage",
    targetId: String(created._id),
    req,
  });

  return { message: GENERIC_SUCCESS_MESSAGE };
}

export async function listContactMessages(
  query: ListMessagesQuery,
): Promise<{ messages: Record<string, unknown>[]; meta: PaginationMeta }> {
  const { page, limit } = normalizePage(query.page, query.limit, 50);
  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = query.status;
  }
  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { name: trusted({ $regex: safePattern }) },
      { email: trusted({ $regex: safePattern }) },
      { subject: trusted({ $regex: safePattern }) },
    ]);
  }

  const [total, docs] = await Promise.all([
    ContactMessage.countDocuments(filter),
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    messages: docs.map((d) => d.toJSON() as unknown as Record<string, unknown>),
    meta: { page, limit, total, totalPages },
  };
}

export async function updateContactMessageStatus(
  id: string,
  input: UpdateMessageStatusInput,
  req?: Request,
): Promise<Record<string, unknown>> {
  const updated = await ContactMessage.findByIdAndUpdate(
    toObjectId(id),
    { $set: { status: input.status } },
    { returnDocument: "after", runValidators: true },
  );

  if (!updated) {
    throw AppError.notFound("Contact message not found");
  }

  await recordAudit({
    category: "ADMIN",
    action: "admin.update_message_status",
    outcome: "SUCCESS",
    actor: req?.user?._id,
    actorEmail: req?.user?.email,
    targetType: "ContactMessage",
    targetId: id,
    req,
    metadata: { status: input.status },
  });

  return (updated as unknown as { toJSON(): Record<string, unknown> }).toJSON();
}

export async function deleteContactMessage(
  id: string,
  req?: Request,
): Promise<{ deleted: true; id: string }> {
  const deleted = await ContactMessage.findByIdAndDelete(toObjectId(id)).lean();
  if (!deleted) {
    throw AppError.notFound("Contact message not found");
  }

  await recordAudit({
    category: "ADMIN",
    action: "admin.delete_message",
    outcome: "SUCCESS",
    actor: req?.user?._id,
    actorEmail: req?.user?.email,
    targetType: "ContactMessage",
    targetId: id,
    req,
    metadata: { subject: deleted.subject, senderEmail: deleted.email },
  });

  return { deleted: true, id };
}
