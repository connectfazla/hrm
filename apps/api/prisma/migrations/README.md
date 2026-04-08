# Prisma migrations

This repo uses Prisma migrations (no one-off SQL).

## Prerequisites
- Postgres must be running and reachable via `DATABASE_URL` (see `/Users/darkk/Uppearance-HRMS/.env.example`).

## Generate migrations

From `apps/api`:
```bash
pnpm db:migrate
```

## Seed initial data

```bash
pnpm db:seed
```

The seed script creates:
- 1 admin user (`admin@uppearance.com`)
- 5 employee users with varied `dateJoined` / probation statuses and initial `LeaveBalanceSnapshot` rows.

