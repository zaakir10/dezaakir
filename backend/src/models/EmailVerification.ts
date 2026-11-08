import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * One active email OTP per user (unique index on `user`). Issuing a new code
 * overwrites the previous one, which invalidates it. Only a keyed HMAC of the
 * code is stored — the plaintext never touches the database or logs.
 */
export interface IEmailVerification {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  codeHash: string;
  attempts: number;
  lastSentAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailVerificationSchema = new Schema<IEmailVerification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0, min: 0, max: OTP_MAX_ATTEMPTS },
    lastSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  baseOptions<IEmailVerification>({}, ["codeHash"]),
);

EmailVerificationSchema.index({ user: 1 }, { unique: true });
// Expired codes are purged automatically.
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerification: Model<IEmailVerification> = model<IEmailVerification>(
  "EmailVerification",
  EmailVerificationSchema,
);
