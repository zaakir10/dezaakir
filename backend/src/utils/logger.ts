import pino from "pino";
import { env, isTest } from "../config/env.js";

/**
 * Structured JSON logger. Sensitive fields are redacted defensively so that
 * passwords, OTPs, tokens, cookies and SMTP credentials can never reach logs,
 * even if a developer accidentally logs a whole request or body.
 */
export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  base: { service: "dezaakir-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "*.password",
      "*.newPassword",
      "*.currentPassword",
      "*.confirmPassword",
      "*.passwordHash",
      "*.otp",
      "*.code",
      "*.token",
      "*.totp",
      "*.mfaSecret",
      "req.headers.cookie",
      "req.headers.authorization",
      "req.headers['x-csrf-token']",
      'res.headers["set-cookie"]',
      "smtp",
    ],
    censor: "[REDACTED]",
  },
});
