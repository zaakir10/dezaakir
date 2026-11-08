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
| Injection | Strict Zod schemas, ObjectId validation, `sanitizeFilter`, `strictQuery` | 2/4 | ⏳ |
| Auth | Argon2id, server-side sessions, OTP, password reset | 3 | ⏳ |
| Auth | Admin TOTP MFA | 3 | ⏳ |
| CSRF | Synchronizer token + Origin check | 4 | ⏳ |
| Rate limits | Login, OTP, reset, contact | 4 | ⏳ |
| XSS | Rich text sanitized on write (allow-list) and on render | 6 | ⏳ |
| Uploads | Magic-byte check, size limits, no SVG, signed Cloudinary uploads | 7 | ⏳ |
| Logging | Auth events, admin audit log, permission denials | 3–8 | ⏳ |
| Backups | Atlas backups + tested `mongodump`/`mongorestore` procedure | 10 | ⏳ |

## Reporting a vulnerability

Please email the site owner privately, not through a public issue.
