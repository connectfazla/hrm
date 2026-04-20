# Prisma migrations

This repo uses Prisma migrations (no one-off SQL).

## Prerequisites
- Postgres must be running and reachable via `DATABASE_URL` (see `/Users/darkk/Uppearance-HRMS/.env.example`).

## Generate migrations

From `apps/api`:
```bash
pnpm db:migrate
```

## Seed (demo / local only)

```bash
pnpm db:seed
```

From `apps/api`, this runs `prisma/seed.ts` (demo admin + sample employee and related rows). **Do not run against production:** if `NODE_ENV=production`, the script exits unless `ALLOW_DEMO_SEED=true`.

**Migrations** (`migrate dev` / `migrate deploy`) never run this seed automatically.

