# Production Deployment & Operations Guide

## 1. Prerequisites

- **Runtime**: Bun `>= 1.2` (`bun --version`)
- **Database**: MongoDB Atlas cluster with separate `dezaakir_dev` and `dezaakir_prod` databases and least-privilege SCRAM-SHA-256 users (`readWrite` on the target database only).
- **Email Transport**: Personal Gmail account with 2-Step Verification enabled and a 16-character **Gmail App Password** (`smtp.gmail.com:587` STARTTLS).
- **Image Storage**: Cloudinary account configured for **signed uploads only** (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- **Hosting**:
  - Frontend: **Vercel** (`dezaakir.com`)
  - Backend: Secure Node/Bun container host such as **Railway**, **Render**, or **Fly.io** (`api.dezaakir.com`) so `SameSite=Lax` cookies remain first-party across subdomains.

---

## 2. Cryptographic Secret Generation

Generate unique production secrets (never reuse development values):

```bash
bun -e "import { randomBytes } from 'node:crypto'; console.log('SESSION_SECRET=' + randomBytes(48).toString('base64url'));"
bun -e "import { randomBytes } from 'node:crypto'; console.log('OTP_HMAC_SECRET=' + randomBytes(48).toString('base64url'));"
bun -e "import { randomBytes } from 'node:crypto'; console.log('MFA_ENCRYPTION_KEY=' + randomBytes(32).toString('base64'));"
```

---

## 3. Production Environment Variables

### Backend (`api.dezaakir.com`)

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://dezaakir.com
TRUST_PROXY=1
LOG_LEVEL=info

MONGODB_URI=mongodb+srv://<prod-user>:<prod-password>@<cluster>.mongodb.net/dezaakir_prod?retryWrites=true&w=majority&tls=true

SESSION_SECRET=<48-byte-base64url-secret>
OTP_HMAC_SECRET=<48-byte-base64url-secret>
MFA_ENCRYPTION_KEY=<32-byte-base64-secret>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-address@gmail.com>
SMTP_APP_PASSWORD=<16-char-gmail-app-password>
EMAIL_FROM="Dezaakir <your-address@gmail.com>"

CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

### Frontend (`dezaakir.com` on Vercel)

Only public URLs are placed in `NEXT_PUBLIC_*` variables:

```env
NEXT_PUBLIC_SITE_URL=https://dezaakir.com
NEXT_PUBLIC_API_URL=https://api.dezaakir.com
```

---

## 4. Database Index Sync & Administrator Bootstrap

1. **Sync MongoDB Indexes**:
   ```bash
   bun --cwd backend run db:indexes
   ```
2. **Bootstrap the Initial Administrator (with TOTP MFA)**:
   ```bash
   ADMIN_NAME="Dezaakir" \
   ADMIN_EMAIL="admin@dezaakir.com" \
   ADMIN_PASSWORD="<StrongPassword16+Chars>" \
   bun --cwd backend run create-admin
   ```
   Scan the `otpauth://` URI into your authenticator app (Google Authenticator, 1Password, or Authy) and store the 8 single-use recovery codes offline.

---

## 5. Database Backup & Restoration

### Automated HMAC-Signed JSON Backup & Restore CLI

In addition to MongoDB Atlas continuous cloud snapshots, you can export and verify signed logical backups at any time:

```bash
# Export all persistent collections into an HMAC-SHA256 signed archive in backend/backups/
bun --cwd backend run db:backup

# Restore and verify checksum + HMAC signature before upserting documents
bun --cwd backend run db:restore backups/dezaakir-backup-<timestamp>.json
```

### Native `mongodump` / `mongorestore`

```bash
mongodump --uri="$MONGODB_URI" --archive=backups/dezaakir.archive --gzip
mongorestore --uri="$MONGODB_URI" --archive=backups/dezaakir.archive --gzip --drop
```

---

## 6. Pre-Release Quality & Security Gates

```bash
bun --cwd backend run typecheck
bun --cwd frontend run typecheck
bun --cwd backend test
bun --cwd frontend run build
bun audit
```
