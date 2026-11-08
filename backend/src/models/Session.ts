import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

/**
 * Server-side session. The browser cookie carries a random 256-bit id; only its
 * SHA-256 hash is stored here, so a database leak cannot be replayed as sessions.
 */
export interface ISession {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  /** HMAC hash of the per-session CSRF token (synchronizer token pattern). */
  csrfTokenHash: string;
  /** True once an admin has completed TOTP for this session. */
  mfaVerified: boolean;
  ip?: string;
  userAgent?: string;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, select: false },
    csrfTokenHash: { type: String, required: true, select: false },
    mfaVerified: { type: Boolean, default: false },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 300 },
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  baseOptions<ISession>({}, ["tokenHash", "csrfTokenHash"]),
);

SessionSchema.index({ tokenHash: 1 }, { unique: true });
SessionSchema.index({ user: 1, revokedAt: 1 });
// MongoDB deletes the document once expiresAt passes.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session: Model<ISession> = model<ISession>("Session", SessionSchema);
