import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const CAMPAIGN_STATUSES = ["QUEUED", "PROCESSING", "COMPLETED", "PARTIAL", "FAILED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const RECIPIENT_MODES = ["SINGLE", "SELECTED", "ALL", "TEST"] as const;
export type RecipientMode = (typeof RECIPIENT_MODES)[number];

export const RECIPIENT_DELIVERY_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export type RecipientDeliveryStatus = (typeof RECIPIENT_DELIVERY_STATUSES)[number];

export interface ICampaignRecipient {
  userId?: Types.ObjectId;
  email: string;
  name?: string;
  status: RecipientDeliveryStatus;
  error?: string;
  sentAt?: Date;
}

export interface IEmailCampaign {
  _id: Types.ObjectId;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  recipientMode: RecipientMode;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  status: CampaignStatus;
  sender: Types.ObjectId;
  senderEmail: string;
  senderName: string;
  respectMarketingConsent: boolean;
  recipients: ICampaignRecipient[];
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailCampaignDocument = HydratedDocument<IEmailCampaign>;

const CampaignRecipientSchema = new Schema<ICampaignRecipient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, trim: true },
    status: {
      type: String,
      enum: RECIPIENT_DELIVERY_STATUSES,
      default: "PENDING",
      required: true,
    },
    error: { type: String, maxlength: 400 },
    sentAt: { type: Date },
  },
  { _id: false }
);

const EmailCampaignSchema = new Schema<IEmailCampaign>(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    bodyHtml: {
      type: String,
      required: true,
      maxlength: 150_000,
    },
    bodyText: {
      type: String,
      required: true,
      maxlength: 100_000,
    },
    recipientMode: {
      type: String,
      enum: RECIPIENT_MODES,
      required: true,
      index: true,
    },
    recipientCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sentCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    failedCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    pendingCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: "QUEUED",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
      default: "Administrator",
    },
    respectMarketingConsent: {
      type: Boolean,
      default: true,
    },
    recipients: {
      type: [CampaignRecipientSchema],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

EmailCampaignSchema.index({ createdAt: -1 });
EmailCampaignSchema.index({ status: 1, createdAt: -1 });

export const EmailCampaign: Model<IEmailCampaign> =
  (mongoose.models.EmailCampaign as Model<IEmailCampaign> | undefined) ??
  mongoose.model<IEmailCampaign>("EmailCampaign", EmailCampaignSchema);
