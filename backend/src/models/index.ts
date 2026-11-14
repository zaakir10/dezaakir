export { User, ROLES, USER_STATUSES, type IUser, type UserDocument, type Role, type UserStatus } from "./User.js";
export { Session, type ISession } from "./Session.js";
export {
  EmailVerification,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  type IEmailVerification,
} from "./EmailVerification.js";
export { PasswordResetToken, RESET_TOKEN_TTL_MS, type IPasswordResetToken } from "./PasswordResetToken.js";
export { Blog, BLOG_STATUSES, type IBlog, type BlogStatus } from "./Blog.js";
export { Project, PROJECT_STATUSES, type IProject, type ProjectStatus } from "./Project.js";
export { Category, CATEGORY_TYPES, type ICategory, type CategoryType } from "./Category.js";
export { Tag, type ITag } from "./Tag.js";
export { ContactMessage, MESSAGE_STATUSES, type IContactMessage, type MessageStatus } from "./ContactMessage.js";
export { Media, MEDIA_FORMATS, type IMedia } from "./Media.js";
export { AuditLog, AUDIT_CATEGORIES, AUDIT_OUTCOMES, type IAuditLog, type AuditCategory, type AuditOutcome } from "./AuditLog.js";
export { SiteSettings, SETTINGS_KEY, type ISiteSettings } from "./SiteSettings.js";
export {
  EmailCampaign,
  CAMPAIGN_STATUSES,
  RECIPIENT_MODES,
  RECIPIENT_DELIVERY_STATUSES,
  type IEmailCampaign,
  type ICampaignRecipient,
  type CampaignStatus,
  type RecipientMode,
} from "./EmailCampaign.js";

import { User } from "./User.js";
import { Session } from "./Session.js";
import { EmailVerification } from "./EmailVerification.js";
import { PasswordResetToken } from "./PasswordResetToken.js";
import { Blog } from "./Blog.js";
import { Project } from "./Project.js";
import { Category } from "./Category.js";
import { Tag } from "./Tag.js";
import { ContactMessage } from "./ContactMessage.js";
import { Media } from "./Media.js";
import { AuditLog } from "./AuditLog.js";
import { SiteSettings } from "./SiteSettings.js";
import { EmailCampaign } from "./EmailCampaign.js";

export const allModels = [
  User,
  Session,
  EmailVerification,
  PasswordResetToken,
  Blog,
  Project,
  Category,
  Tag,
  ContactMessage,
  Media,
  AuditLog,
  SiteSettings,
  EmailCampaign,
] as const;
