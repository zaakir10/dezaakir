# Deployment

> Phase 10 completes this guide. This version covers local development.

## Prerequisites

- Bun ≥ 1.2 (`bun --version`)
- A MongoDB Atlas cluster (separate `dezaakir_dev` and `dezaakir_prod` databases/users)
- A Gmail account with 2-Step Verification and an **App Password**
- A Cloudinary account

## Local development

```bash
bun install                      # installs both workspaces
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# fill in backend/.env (never commit it)

bun run dev:backend              # http://localhost:4000/api/health
bun run dev:frontend             # http://localhost:3000
```

Generate secrets:

```bash
bun -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # SESSION_SECRET / OTP_HMAC_SECRET
bun -e "console.log(require('crypto').randomBytes(32).toString('base64'))"      # MFA_ENCRYPTION_KEY
```

## Quality gates

```bash
bun run typecheck
bun run test
bun audit
```
