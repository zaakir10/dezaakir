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

## Planned (later phases)

| Group | Endpoints | Phase |
|---|---|---|
| Blogs | `GET /api/blogs`, `GET /api/blogs/:slug`, `POST /api/blogs`, `PUT /api/blogs/:id`, `DELETE /api/blogs/:id` | 6 |
| Projects | `GET /api/projects`, `GET /api/projects/:slug`, `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` | 7 |
| Admin users | `GET /api/admin/users`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id/status` | 8 |
| Contact | `POST /api/contact`, `GET /api/admin/messages`, `PATCH /api/admin/messages/:id` | 4/8 |
