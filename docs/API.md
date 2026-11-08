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

## Planned (later phases)

| Group | Endpoints | Phase |
|---|---|---|
| Auth | `POST /api/auth/register`, `verify-email`, `resend-verification`, `login`, `logout`, `forgot-password`, `reset-password`; `GET /api/auth/me`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id` | 3 |
| Blogs | `GET /api/blogs`, `GET /api/blogs/:slug`, `POST /api/blogs`, `PUT /api/blogs/:id`, `DELETE /api/blogs/:id` | 6 |
| Projects | `GET /api/projects`, `GET /api/projects/:slug`, `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` | 7 |
| Admin users | `GET /api/admin/users`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id/status` | 8 |
| Contact | `POST /api/contact`, `GET /api/admin/messages`, `PATCH /api/admin/messages/:id` | 4/8 |
