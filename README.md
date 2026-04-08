# Upappearance HRMS

Full-stack HR management system for a small team (UAE/Dubai).

## Stack
- Web: Next.js (`apps/web`)
- API: NestJS (`apps/api`)
- DB: PostgreSQL (Prisma schema/migrations)
- Email: SMTP (Mailhog recommended for local)
- Docs: local encrypted storage (`storage/`)

## Prerequisites
- Node `20.x` (see `.nvmrc`)
- pnpm
- Postgres running locally (or via Docker, if available on your machine)

## Environment variables
- Copy `.env.example` to `.env` and adjust as needed.

## Run locally

### 1) Install
```bash
pnpm install
```

### 2) Start database
If you have Docker:
```bash
docker compose up -d
```

If you don't have Docker, run Postgres locally and ensure `DATABASE_URL` is reachable.

### 3) Migrate + seed
```bash
cd apps/api
pnpm db:migrate
pnpm db:seed
```

Seeded credentials (local only):
- Admin: `admin@uppearance.com` / `Admin123!`
- Employees: `<workEmail>` / `Employee123!`

### 4) Start API
```bash
cd apps/api
pnpm start:dev
```

API base: `http://localhost:4000/api/v1`\nSwagger: `http://localhost:4000/api/docs`\n\n### 5) Start web\n```bash\ncd apps/web\npnpm dev\n```\nWeb: `http://localhost:3000`\n+
