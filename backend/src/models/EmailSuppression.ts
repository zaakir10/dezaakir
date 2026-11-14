import { Schema, model, type Model, type Types } from "mongoose";
import { baseOptions } from "./shared.js";

export interface IEmailSuppression {
  _id: Types.ObjectId;
  email: string;
  failureCount: number;
  suppressed: boolean;
  reason: string;
  lastErrorCategory: string;
  lastFailedAt: Date;
  suppressedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSuppressionSchema = new Schema<IEmailSuppression>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    failureCount: { type: Number, required: true, default: 1, min: 0 },
    suppressed: { type: Boolean, required: true, default: false, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    lastErrorCategory: { type: String, required: true, trim: true, maxlength: 60 },
    lastFailedAt: { type: Date, required: true, default: Date.now },
    suppressedAt: { type: Date },
  },
  baseOptions<IEmailSuppression>(),
);

EmailSuppressionSchema.index({ email: 1 }, { unique: true });

export const EmailSuppression: Model<IEmailSuppression> = model<IEmailSuppression>(
  "EmailSuppression",
  EmailSuppressionSchema,
);
