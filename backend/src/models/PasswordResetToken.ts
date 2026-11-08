import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Single-use password reset token. Only the SHA-256/HMAC hash is stored. */
export interface IPasswordResetToken {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  requestedIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    requestedIp: { type: String, maxlength: 64 },
  },
  baseOptions<IPasswordResetToken>({}, ["tokenHash"]),
);

PasswordResetTokenSchema.index({ tokenHash: 1 }, { unique: true });
PasswordResetTokenSchema.index({ user: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken: Model<IPasswordResetToken> = model<IPasswordResetToken>(
  "PasswordResetToken",
  PasswordResetTokenSchema,
);
