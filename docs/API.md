# API Reference

Base URL: `http://localhost:4000` (dev).

All responses use this envelope:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "STRING_CODE", "message": "Human readable" } }
```

Standard error codes: `BAD_REQUEST`, `VALIDATION_ERROR`, `INVALID_JSON`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `METHOD_NOT_ALLOWED`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## Implemented

### `GET /api/health`
Liveness probe. Returns `{ "success": true, "data": { "status": "ok" } }` with `Cache-Control: no-store`.

### `GET /api/health/ready`
Readiness probe. Returns `200 { "success": true, "data": { "status": "ready" } }` when the MongoDB connection is active, or `503 NOT_READY` otherwise.

### Authentication (`/api/auth`)

| Method & Path | Auth | Description |
|---|---|---|
| `POST /api/auth/register` | Public | Registers a `PENDING` user (`role=USER`), hashes password with Argon2id, and sends a 6-digit OTP via Gmail SMTP. |
| `POST /api/auth/verify-email` | Public | Verifies the 6-digit OTP (10m expiry, max 5 attempts, single-use) and activates the account. |
| `POST /api/auth/resend-verification` | Public | Re-issues a 6-digit OTP (60s cooldown, invalidates previous OTP) without revealing account existence. |
| `POST /api/auth/login` | Public | Authenticates verified users, enforces brute-force lockout (5 attempts / 15m), enforces Admin TOTP MFA or single-use recovery code, and sets the `HttpOnly` `dezaakir_sid` cookie. |
| `POST /api/auth/logout` | Cookie | Revokes the current server-side session and clears the session cookie. |
| `POST /api/auth/logout-all` | Auth | Revokes all active sessions for the current user. |
| `POST /api/auth/forgot-password` | Public | Issues a single-use 30m reset token via Gmail SMTP without disclosing whether the email is registered. |
| `POST /api/auth/reset-password` | Public | Verifies & consumes the single-use reset token, updates the Argon2id password hash, and revokes all existing sessions. |
| `GET /api/auth/me` | Auth | Returns the current user profile, session metadata, and synchronizer `csrfToken`. |
| `PATCH /api/auth/me` | Auth | Updates the authenticated user's profile (`name`). |
| `POST /api/auth/change-password` | Auth | Verifies current password, updates password hash, and revokes all other sessions. |
| `GET /api/auth/sessions` | Auth | Lists active sessions for the authenticated user. |
| `DELETE /api/auth/sessions/:id` | Auth | Revokes a specific session belonging to the authenticated user. |
| `POST /api/auth/mfa/setup` | Auth | Generates an AES-256-GCM encrypted TOTP secret and returns `{ secret, otpauthUri }`. |
| `POST /api/auth/mfa/enable` | Auth | Verifies a 6-digit TOTP code, enables MFA on the account, marks the session `mfaVerified=true`, and returns 8 single-use recovery codes. |

### Contact (`/api/contact` & `/api/admin/messages`)

| Method & Path | Auth | Description |
|---|---|---|
| `POST /api/contact` | Public | Validates contact submission, applies honeypot + IP/email rate limiting (5 / 15m), escapes XSS payloads, and stores message in MongoDB. |
| `GET /api/admin/messages` | Admin + MFA | Lists contact messages with pagination (`page`, `limit`) and optional `status` (`NEW` \| `READ` \| `ARCHIVED`) filter. |
| `PATCH /api/admin/messages/:id` | Admin + MFA + CSRF | Updates a contact message's status (`NEW` \| `READ` \| `ARCHIVED`) and records an admin audit log. |

### Site Settings (`/api/settings` & `/api/admin/settings`)

| Method & Path | Auth | Description |
|---|---|---|
| `GET /api/settings` | Public | Returns the public site settings singleton (biography, skills, experience, education, social links, CV URL, SEO defaults). |
| `PUT /api/admin/settings` | Admin + MFA + CSRF | Updates the site settings singleton and records an admin audit log. |

### Blogs, Categories & Tags (`/api/blogs`, `/api/admin/blogs`, `/api/categories`, `/api/tags`)

| Method & Path | Auth | Description |
|---|---|---|
| `GET /api/blogs` | Public | Lists published (and due-scheduled) articles with pagination, category/tag/featured filters, and escaped regex search. Never exposes drafts. |
| `GET /api/blogs/:slug` | Public | Returns a single published article by slug along with up to 3 related articles. |
| `POST /api/blogs` | Admin + MFA + CSRF | Creates an article, sanitizes rich HTML (`sanitizeRichHtml`), computes reading time, and ensures a unique slug. |
| `PUT /api/blogs/:id` | Admin + MFA + CSRF | Updates an article (draft, scheduled, or published) and recomputes reading time. |
| `DELETE /api/blogs/:id` | Admin + MFA + CSRF | Deletes an article and records an admin audit log. |
| `GET /api/admin/blogs` | Admin + MFA | Lists all articles (including `DRAFT` and `SCHEDULED`) for the Admin Dashboard. |
| `GET /api/admin/blogs/:id` | Admin + MFA | Fetches any article by id for editing in the Admin Dashboard. |
| `GET /api/categories` | Public | Lists categories (optional `?type=BLOG\|PROJECT`). |
| `POST /api/categories` | Admin + MFA + CSRF | Creates a `BLOG` or `PROJECT` category. |
| `DELETE /api/categories/:id` | Admin + MFA + CSRF | Deletes a category and unsets references on affected posts/projects. |
| `GET /api/tags` | Public | Lists all blog tags. |
| `POST /api/tags` | Admin + MFA + CSRF | Creates a blog tag. |
| `DELETE /api/tags/:id` | Admin + MFA + CSRF | Deletes a blog tag and pulls it from affected posts. |

### Projects & Media (`/api/projects`, `/api/admin/projects`, `/api/admin/media`)

| Method & Path | Auth | Description |
|---|---|---|
| `GET /api/projects` | Public | Lists published projects (`Project.publicFilter()`) with pagination, category/technology/featured filters, and escaped regex search. Never exposes drafts. |
| `GET /api/projects/:slug` | Public | Returns a single published project by slug. Drafts return `404`. |
| `POST /api/projects` | Admin + MFA + CSRF | Creates a project, sanitizes `description` HTML (`sanitizeRichHtml`), validates HTTPS GitHub/live URLs, and ensures a unique slug. |
| `PUT /api/projects/:id` | Admin + MFA + CSRF | Updates a project (draft or published) and records an admin audit log. |
| `DELETE /api/projects/:id` | Admin + MFA + CSRF | Deletes a project and records an admin audit log. |
| `GET /api/admin/projects` | Admin + MFA | Lists all projects (including `DRAFT`) for the Admin Dashboard. |
| `GET /api/admin/projects/:id` | Admin + MFA | Fetches any project by id for editing in the Admin Dashboard. |
| `GET /api/admin/media` | Admin + MFA | Lists registered Cloudinary media assets with pagination and folder filter. |
| `POST /api/admin/media/sign` | Admin + MFA + CSRF | Generates signed Cloudinary upload parameters (`signature`, `timestamp`, `publicId`, `folder`). |
| `POST /api/admin/media/upload` | Admin + MFA + CSRF | Verifies magic-byte image signatures (PNG, JPEG, GIF, WebP, AVIF), blocks SVGs/executables/polyglots/MIME mismatches, uploads to Cloudinary, and registers a `Media` document. |
| `DELETE /api/admin/media/:id` | Admin + MFA + CSRF | Deletes an unused media asset (`409 CONFLICT` if referenced by a blog or project). |

## Planned (later phases)

| Group | Endpoints | Phase |
|---|---|---|
| Admin users & overview | `GET /api/admin/overview`, `GET /api/admin/users`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id/status`, `GET /api/admin/audit-logs` | 8 |
