# Uppearance HRMS

Full-stack HR management system built for small teams in the UAE (Dubai). Clean, modern SaaS-style UI with UAE Labour Law compliance.

## Features

- **Authentication & Roles** — JWT-based login, Admin/Employee roles, password reset via email, session management
- **Employee Management** — Full CRUD with personal info, ID documents, employment details, compensation, bank account, emergency contacts, notes
- **Time Tracking** — Clock in/out, lunch breaks, late detection, world clocks (Dubai, Dhaka, Cairo), session tracking
- **Timesheet** — Daily session view with summary cards, date range filters, CSV/PDF export
- **Leave Management** — UAE Labour Law compliance (probation rules, annual/emergency/sick/maternity/study/Hajj leave), request workflow, balance dashboard
- **Payroll** — Monthly payroll runs, payslip generation, employee preview, CSV export, past run history
- **Document Vault** — Encrypted file storage (AES-256-GCM), category management, expiry tracking with alerts
- **Salary Journey** — Full salary change history with raise dates and percentage tracking
- **Admin Dashboard** — KPIs, attendance overview, pending requests, quick actions, probation alerts
- **Reports & Analytics** — Headcount, attendance, leave, payroll, and probation metrics
- **Attendance Reports** — Filterable by year, month, department; per-employee stats
- **Admin Settings** — Profile management, company settings, SMTP configuration, email templates with variable placeholders
- **API Documentation** — In-app endpoint reference with cURL examples, link to Swagger/OpenAPI
- **Notifications** — In-app alerts for leave decisions, document expiry, salary changes

## Tech Stack


| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router), React, Tailwind CSS, shadcn/ui |
| Backend      | NestJS, Prisma ORM                                      |
| Database     | PostgreSQL                                              |
| Auth         | JWT (access + refresh tokens), HttpOnly cookies, bcrypt |
| Email        | Nodemailer (Mailhog for dev)                            |
| File Storage | Local encrypted (AES-256-GCM)                           |


## Project Structure

```
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── prisma/   # Schema, migrations, seed
│   │   └── src/      # Modules: auth, employees, attendance, leave, payroll, documents, settings, reports, notifications
│   └── web/          # Next.js frontend
│       └── src/
│           ├── app/           # Pages (app router)
│           ├── components/    # Shared UI components
│           └── lib/           # Utilities (api, auth, cn)
├── packages/
│   └── shared/       # Shared types and schemas
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Prerequisites

- Node.js `20.x` (see `.nvmrc`)
- pnpm
- PostgreSQL (local or Docker)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and JWT secrets.

### 3. Start database

**With Docker:**

```bash
docker compose up -d
```

**Without Docker (macOS):**

```bash
brew install postgresql@16
brew services start postgresql@16
psql -d postgres -c "CREATE USER uppearance WITH PASSWORD 'uppearance' CREATEDB;"
psql -d postgres -c "CREATE DATABASE uppearance_hrms OWNER uppearance;"
```

### 4. Run migrations and seed

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the API

```bash
cd apps/api
pnpm start:dev
```

API: `http://localhost:4000/api/v1`
Swagger: `http://localhost:4000/api/docs`

### 6. Start the web app

```bash
cd apps/web
pnpm dev
```

Web: `http://localhost:3000`

## Default Credentials


| Role     | Email                  | Password       |
| -------- | ---------------------- | -------------- |
| Admin    | `admin@uppearance.com` | `Admin123!`    |
| Employee | `fazla@uppearance.com` | `Employee123!` |


## Environment Variables


| Variable                     | Description                                                               | Default                 |
| ---------------------------- | ------------------------------------------------------------------------- | ----------------------- |
| `DATABASE_URL`               | PostgreSQL connection string                                              | —                       |
| `JWT_ACCESS_SECRET`          | Secret for access tokens                                                  | —                       |
| `JWT_REFRESH_SECRET`         | Secret for refresh tokens                                                 | —                       |
| `JWT_ACCESS_TTL_SECONDS`     | Access token TTL                                                          | `900`                   |
| `JWT_REFRESH_TTL_SECONDS`    | Refresh token TTL                                                         | `1209600`               |
| `SESSION_IDLE_TTL_SECONDS`   | Idle session timeout                                                      | `1800`                  |
| `SMTP_HOST`                  | SMTP server host                                                          | `localhost`             |
| `SMTP_PORT`                  | SMTP server port                                                          | `1025`                  |
| `SMTP_USER`                  | SMTP username                                                             | —                       |
| `SMTP_PASS`                  | SMTP password                                                             | —                       |
| `SMTP_FROM`                  | From email address                                                        | `hrms@uppearance.local` |
| `FILE_ENCRYPTION_KEY`        | 32-byte hex key for document encryption                                   | —                       |
| `WEB_BASE_URL`               | Frontend URL                                                              | `http://localhost:3000` |
| `CORS_ORIGIN`                | Allowed CORS origins (comma-separated)                                    | `http://localhost:3000` |
| `REGISTRATION_CODE_ADMIN`    | Self-register code that creates an **ADMIN** account                      | `darkk`                 |
| `REGISTRATION_CODE_EMPLOYEE` | Self-register code that creates an **EMPLOYEE** account                   | `upp`                   |
| `FILES_STORAGE_ROOT`         | Directory for uploaded documents (cleared on “Delete all data” when safe) | `storage`               |


## API Overview

All endpoints are prefixed with `/api/v1`. Authentication uses HttpOnly cookies.


| Category   | Key Endpoints                                                                             |
| ---------- | ----------------------------------------------------------------------------------------- |
| Auth       | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `PUT /auth/profile`            |
| Employees  | `GET /employees`, `POST /employees`, `PUT /employees/:id`                                 |
| Attendance | `POST /attendance/clock-in`, `POST /attendance/clock-out`, `GET /attendance/:id/sessions` |
| Leave      | `POST /leave/request`, `GET /leave/requests`, `PUT /leave/request/:id/approve`            |
| Payroll    | `GET /payroll/runs`, `POST /payroll/:month/run`, `GET /payroll/export`                    |
| Documents  | `POST /documents/upload`, `GET /documents/:employeeId`, `GET /documents/expirations`      |
| Settings   | `GET /settings`, `PUT /settings/:key`, `POST /settings/smtp/test`                         |
| Reports    | `GET /reports/summary`, `GET /reports/attendance`                                         |


Full API documentation is available in-app at **Admin > API Docs** or via Swagger at `/api/docs`.

## Production Deployment

**Git commits do not touch your database.** Pushing code only updates the repository. Nothing in the default API container startup or in `prisma migrate deploy` runs the seed script or adds demo employees.

```bash
cp .env.production.example .env.production
# Edit .env.production with production values

docker compose -f docker-compose.prod.yml up -d
```

**Database persistence:** Postgres stores data in the Docker volume `pg_data`. Rebuilding images (`build --no-cache`) does not remove it. Avoid `docker compose down -v`, which deletes named volumes and wipes the database.

**Migrations vs seed:** `git pull` only updates code — it never runs Prisma or loads data. The `**migrate`** service (profile `**setup**`) runs `prisma migrate deploy` only (schema changes; migration SQL in this repo has no bundled demo `INSERT`s). Demo users and sample HR rows are added **only** if someone runs `**prisma db seed`** or Compose `**--profile demo**`. The seed script **refuses to run when `NODE_ENV=production`** unless `**ALLOW_DEMO_SEED=true**` is set, so a normal API deploy or migrate job cannot load demo data by accident.

Example routine update (after `git pull`):

```bash
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d postgres
docker compose --profile setup -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d
```

Optional demo dataset (empty DBs / staging only — **never** point at live prod):

```bash
ALLOW_DEMO_SEED=true docker compose --profile demo -f docker-compose.prod.yml run --rm seed
```

Without `ALLOW_DEMO_SEED=true`, the seed container exits immediately when `NODE_ENV=production` (as set in Compose for that service).

## Currency

All monetary values are in **AED** (UAE Dirham).