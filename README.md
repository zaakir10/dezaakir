# Dezaakir — Developer Portfolio & Technology Publication

A secure, dynamic portfolio and tech blog platform with an admin dashboard. It's built as a **Bun** monorepo.

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Framer Motion · Lucide |
| Backend | Bun · Express 5 · TypeScript (strict, ES Modules) · Mongoose · Zod · Nodemailer |
| Data / services | MongoDB Atlas · Cloudinary · Gmail SMTP |

**Brand:** Navy `#0B1628` and White `#FFFFFF` only.

## Quick start

```bash
bun install
cp backend/.env.example backend/.env          # fill in values (never commit)
cp frontend/.env.example frontend/.env.local
bun run dev:backend    # http://localhost:4000/api/health
bun run dev:frontend   # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `bun run typecheck` | Strict TypeScript checks in both apps |
| `bun run test` | Backend test suite (`bun test` + Supertest) |
| `bun run build` | Typecheck the backend and build the frontend |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [API](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)

## Pinned versions (Phase 1)

| Package | Version |
|---|---|
| bun | 1.4.3 |
| next | 16.4.5 |
| react / react-dom | 19.3.1 |
| tailwindcss | 4.3.5 |
| framer-motion | 14.10.1 |
| express | 5.3.0 |
| mongoose | 9.12.0 |
| helmet | 8.3.0 |
| zod | 4.6.7 |
| pino | 10.4.0 |
| typescript | 7.0.2 |
