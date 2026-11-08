import { z } from "zod";

/**
 * Centralised, validated configuration.
 * The process refuses to start when a required variable is missing or malformed,
 * so misconfiguration is caught at boot instead of at request time.
 * Secret values are never logged.
 */

const secret = (name: string) =>
  z.string().min(32, `${name} must be at least 32 characters`);

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    FRONTEND_URL: z.url(),
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "MONGODB_URI must be a MongoDB connection string"),

    SESSION_SECRET: secret("SESSION_SECRET"),
    OTP_HMAC_SECRET: secret("OTP_HMAC_SECRET"),
    MFA_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, "base64").length === 32, "MFA_ENCRYPTION_KEY must be 32 bytes, base64-encoded"),

    SMTP_HOST: z.string().default("smtp.gmail.com"),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_SECURE: booleanString.default(false),
    SMTP_USER: z.string().default(""),
    SMTP_APP_PASSWORD: z.string().default(""),
    EMAIL_FROM: z.string().default(""),

    CLOUDINARY_CLOUD_NAME: z.string().default(""),
    CLOUDINARY_API_KEY: z.string().default(""),
    CLOUDINARY_API_SECRET: z.string().default(""),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    const requiredInProd = [
      "SMTP_USER",
      "SMTP_APP_PASSWORD",
      "EMAIL_FROM",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ] as const;
    for (const key of requiredInProd) {
      if (!env[key]) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required in production` });
      }
    }
    if (!env.FRONTEND_URL.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["FRONTEND_URL"], message: "FRONTEND_URL must use https in production" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Only print variable names and messages — never values.
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`Invalid environment configuration:\n${problems}`);
    process.exit(1);
  }
  return Object.freeze(parsed.data);
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
