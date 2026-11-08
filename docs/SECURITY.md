# Security

**Targets:** OWASP ASVS Level 2, with OWASP Top 10 (2021) and the OWASP API Security Top 10 (2023) as references.

> Passing tests does not prove the application is secure. This document tracks controls, their implementation status, and residual risk.

## Secrets handling

- Secrets live only in `backend/.env` locally and in the hosting provider's secret store in production. `.env*` files are git-ignored, and only `.env.example` (placeholders) is committed.
- Gmail access uses a **Gmail App Password**. Your normal Gmail password is never requested or stored. Two-step verification must be on to create one: Google Account → Security → 2-Step Verification → App passwords.
- `NEXT_PUBLIC_*` variables contain **public URLs only**.
- The env validator prints variable names, never values.
- The logger redacts passwords, OTPs, tokens, cookies, authorization headers and SMTP data.

## Control matrix

| Area | Control | Phase | Status |
|---|---|---|---|
| HTTP | Helmet: strict CSP (`default-src 'none'`, `frame-ancestors 'none'`) on the API | 1 | ✅ |
| HTTP | HSTS (2 years, preload) in production | 1 | ✅ |
| HTTP | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, no `X-Powered-By` | 1 | ✅ |
| HTTP | Frontend CSP and security headers via `next.config.ts` | 1 | ✅ |
| API | Only listed HTTP methods allowed (TRACE/CONNECT → 405) | 1 | ✅ |
| API | Body size limits (JSON 100 KB) | 1 | ✅ |
| API | Simple query parser (no nested objects → blocks `?x[$ne]=`) | 1 | ✅ |
| API | Single-origin CORS with credentials | 1 | ✅ |
| API | Safe error handler (no stack/driver leakage) and consistent envelope | 1 | ✅ |
| API | Request correlation ids | 1 | ✅ |
| Config | Fail-fast env validation; production requires HTTPS and real secrets | 1 | ✅ |
| Database | Production TLS enforcement (`assertSecureUri`), `strictQuery: true`, `strict: "throw"`, `sanitizeFilter: true` | 2 | ✅ |
| Database | Sensitive fields (`passwordHash`, `tokenHash`, `codeHash`, `mfa.secretEncrypted`) hidden via `select: false` and `toJSON` transforms | 2 | ✅ |
| Database | Automatic TTL cleanup for expired sessions, OTPs, password reset tokens, unverified accounts, and audit logs | 2 | ✅ |
| Injection | ObjectId validation (`toObjectId`), regex escaping (`escapeRegex`), `sanitizeFilter`, `strictQuery` | 2 | ✅ |
| Auth | Argon2id (`Bun.password`), server-side sessions (`HttpOnly`, `SameSite=Lax`, `Secure` in prod), session regeneration & revocation | 3 | ✅ |
| Auth | 6-digit CSPRNG Email OTP (keyed HMAC-SHA256, 10m expiry, 60s resend cooldown, 5 attempt limit, single-use) via Gmail SMTP TLS | 3 | ✅ |
| Auth | Single-use hashed password reset tokens (30m expiry) + automatic revocation of all existing sessions | 3 | ✅ |
| Auth | Admin TOTP MFA (RFC 6238, AES-256-GCM encrypted secret at rest, 8 single-use hashed recovery codes) + CLI `create-admin` bootstrap | 3 | ✅ |
| CSRF | Synchronizer token (`X-CSRF-Token` verified in constant time against `session.csrfTokenHash`) + `Origin`/`Referer` check | 4 | ✅ |
| Rate limits | IP + email sliding-window limiters on registration, OTP verify/resend, login, password reset, and contact form | 4 | ✅ |
| Injection | Recursive NoSQL operator & prototype pollution guard (`sanitizeInput`) with suspicious request audit logging | 4 | ✅ |
| XSS | Allow-list rich HTML sanitizer (`sanitizeRichHtml`) & plain-text entity escaping (`sanitizePlainText`) | 4 | ✅ |
| Contact | Honeypot spam protection, CR/LF header-injection prevention, IP hashing, and Admin MFA-gated review | 4 | ✅ |
| Uploads | Magic-byte signature verification (PNG/JPEG/GIF/WebP/AVIF), 5MB limit, SVG/executable/polyglot rejection, MIME match check, signed Cloudinary uploads, in-use reference protection | 7 | ✅ |
| Logging | Structured Pino redaction + append-only `AuditLog` for auth events, admin actions, user status changes, and permission denials | 3–8 | ✅ |
| Backups | Atlas backups + tested `mongodump`/`mongorestore` procedure | 10 | ⏳ |

## Reporting a vulnerability

Please email the site owner privately, not through a public issue.
