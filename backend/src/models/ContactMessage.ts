import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

export const MESSAGE_STATUSES = ["NEW", "READ", "ARCHIVED"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/**
 * Contact form submission. Stored as plain text; the frontend renders it as text
 * (never as HTML), so stored XSS is impossible by construction.
 * The submitter IP is stored only as a keyed hash for abuse correlation.
 */
export interface IContactMessage {
  _id: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: MessageStatus;
  ipHash?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    // No CR/LF in subject — prevents email header injection when forwarding.
    subject: { type: String, required: true, trim: true, minlength: 2, maxlength: 150, match: /^[^\r\n]*$/ },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    status: { type: String, enum: MESSAGE_STATUSES, default: "NEW", required: true },
    ipHash: { type: String, maxlength: 128, select: false },
    userAgent: { type: String, maxlength: 300, select: false },
  },
  baseOptions<IContactMessage>({}, ["ipHash", "userAgent"]),
);

ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ createdAt: -1 });

export const ContactMessage: Model<IContactMessage> = model<IContactMessage>("ContactMessage", ContactMessageSchema);
