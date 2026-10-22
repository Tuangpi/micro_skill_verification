# Micro Skill — Application Foundation

This repository is an npm workspace containing a TypeScript backend and a TypeScript frontend.

- `backend/` — Express 5 + Prisma 7 + PostgreSQL API
- `frontend/` — React 19 + Vite 8 + Tailwind CSS 4 SPA

## Prerequisites

- Node.js >= 22.12.0
- npm >= 11
- PostgreSQL >= 15 with a role that can create databases and schemas

## Setup

```bash
npm install

# Backend configuration
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test
# Edit backend/.env and backend/.env.test to match your PostgreSQL credentials.

# Generate the Prisma client and apply migrations
npm run db:generate
npm run db:migrate --workspace backend
```

`package-lock.json` is committed, so CI and other machines can reproduce the exact
dependency tree with `npm ci` instead of `npm install`.

`backend/.env` and `backend/.env.test` are git-ignored. Only the `.example` files are tracked.

## Common commands

Run from the repository root:

| Command                                  | Purpose                                    |
| ---------------------------------------- | ------------------------------------------ |
| `npm run dev`                            | Start the backend and frontend together    |
| `npm run build`                          | Build both workspaces                      |
| `npm run typecheck`                      | Type-check both workspaces                 |
| `npm run lint`                           | Lint both workspaces                       |
| `npm run format`                         | Format the workspace with Prettier         |
| `npm run test`                           | Run all backend and frontend tests         |
| `npm run verify`                         | format:check, lint, typecheck, test, build |
| `npm run db:generate`                    | Regenerate the Prisma client               |
| `npm run db:migrate --workspace backend` | Create/apply a development migration       |

The backend serves `http://localhost:4000` and the frontend dev server runs on `http://localhost:5173`.
Vite proxies `/api` to the backend, so both run on one origin in development.

### Database roles

The `micro_skill` role needs `CREATEDB` (Prisma shadow database) and privileges on the
`public` schema of each target database:

```sql
CREATE ROLE micro_skill WITH LOGIN PASSWORD 'change-me' CREATEDB;
GRANT ALL ON SCHEMA public TO micro_skill;
```

Apply the schema grant to `micro_skill_dev` and `micro_skill_test` separately.

## Environment variables

See `backend/.env.example` for the full list. The backend validates its configuration
with Zod at startup and exits with an actionable message if anything is missing.

| Variable          | Default         | Purpose                                 |
| ----------------- | --------------- | --------------------------------------- |
| `PORT`            | `4000`          | Backend HTTP port                       |
| `API_PREFIX`      | `/api/v1`       | Versioned API prefix                    |
| `ALLOWED_ORIGINS` | `''`            | Comma-separated CORS allowlist          |
| `LOG_LEVEL`       | `info`          | Pino log level                          |
| `DATABASE_URL`    | —               | PostgreSQL connection string (required) |
| `STORAGE_ROOT`    | `./var/storage` | Private file storage root               |
| `TRUST_PROXY`     | `false`         | Trust `X-Forwarded-*` headers           |

## Testing

Backend tests run against the `micro_skill_test` database. The test environment loads
`backend/.env.test`, so `DATABASE_URL` must point at the test database there.

```bash
npm run test --workspace backend
npm run test --workspace frontend
```

The backend health test performs a real database query, so PostgreSQL must be running.

## API contract

The response envelope, error codes, and status codes are documented in
[`docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md).

- Success: `{ "data": ... }`
- Failure: `{ "error": { "code", "message", "details"? } }`

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DATA_MODEL_AND_API.md`](docs/DATA_MODEL_AND_API.md)
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- [`docs/SECURITY_AND_OPERATIONS.md`](docs/SECURITY_AND_OPERATIONS.md)
- [`docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md)
