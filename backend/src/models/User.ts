import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** PENDING = registered but email not verified; SUSPENDED = blocked by an admin. */
export const USER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  emailVerified: boolean;
  status: UserStatus;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  failedLoginCount: number;
  lockedUntil?: Date;
  mfa: {
    enabled: boolean;
    /** AES-256-GCM encrypted TOTP secret (iv:tag:ciphertext, base64). */
    secretEncrypted?: string;
    /** HMAC hashes of single-use recovery codes. */
    recoveryCodeHashes: string[];
    enabledAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    // Always defaults to USER. No public endpoint accepts `role`; ADMIN is only
    // granted through the CLI bootstrap command (`bun run create-admin`).
    role: { type: String, enum: ROLES, default: "USER", required: true },
    emailVerified: { type: Boolean, default: false, required: true },
    status: { type: String, enum: USER_STATUSES, default: "PENDING", required: true },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    failedLoginCount: { type: Number, default: 0, min: 0, select: false },
    lockedUntil: { type: Date, select: false },
    mfa: {
      enabled: { type: Boolean, default: false },
      secretEncrypted: { type: String, select: false },
      recoveryCodeHashes: { type: [String], default: [], select: false },
      enabledAt: { type: Date },
    },
  },
  baseOptions<IUser>({}, [
    "passwordHash",
    "failedLoginCount",
    "lockedUntil",
    "mfa.secretEncrypted",
    "mfa.recoveryCodeHashes",
  ]),
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ name: "text", email: "text" });
// Unverified accounts that never completed registration are removed after 7 days.
UserSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 3600, partialFilterExpression: { emailVerified: false, status: "PENDING" }, name: "pending_user_ttl" },
);

export const User: Model<IUser> = model<IUser>("User", UserSchema);
