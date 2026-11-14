import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

export const MODERATION_ACTIONS = ["SUSPENDED", "REINSTATED", "AUTO_REINSTATED"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const SUSPENSION_DURATIONS = ["1H", "24H", "7D", "30D", "PERMANENT", "MANUAL", "AUTO"] as const;
export type SuspensionDuration = (typeof SUSPENSION_DURATIONS)[number];

export interface IModerationLog {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userEmail: string;
  userName: string;
  action: ModerationAction;
  durationType: SuspensionDuration;
  reason: string;
  notes?: string;
  expiresAt?: Date;
  actor?: Types.ObjectId;
  actorEmail?: string;
  createdAt: Date;
}

const ModerationLogSchema = new Schema<IModerationLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    userName: { type: String, required: true, trim: true, maxlength: 100 },
    action: { type: String, enum: MODERATION_ACTIONS, required: true, index: true },
    durationType: { type: String, enum: SUSPENSION_DURATIONS, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 1000 },
    expiresAt: { type: Date },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
  },
  baseOptions<IModerationLog>({ timestamps: { createdAt: true, updatedAt: false } }),
);

ModerationLogSchema.index({ createdAt: -1 });
ModerationLogSchema.index({ user: 1, createdAt: -1 });

export const ModerationLog: Model<IModerationLog> = model<IModerationLog>("ModerationLog", ModerationLogSchema);
