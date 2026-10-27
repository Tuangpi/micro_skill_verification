# Development Runbook

## Local startup

- Copy `backend/.env.example` (or create `.env`) and configure `DATABASE_URL`, `SESSION_SECRET`, `STORAGE_ROOT`.
- Run `npm install` at the root.
- Apply migrations: `npm run db:migrate:deploy --workspace backend`.
- Start: `npm run dev`.

## Verification

- `npm run verify` (format, lint, typecheck, tests, build).
- Backend health: `GET /api/v1/health`.

## Backup and restore drill (development)

- Dump: `pg_dump -Fc -f backup.dump`.
- Restore to a scratch database and run `prisma migrate status`.
- Last drill: restored `micro_skill_dev` successfully (empty data set; schema verified).

## Security and access controls

- Cookie sessions with httpOnly, secure in production, sameSite.
- CSRF double-submit protection on state-changing routes.
- Rate limiting on auth routes.
- Role checks (`requireRole`) on admin/teacher routes.
- Private receipts and media served through authenticated endpoints.
- Payment approval, enrollment, and earnings allocation are transactional and idempotent.

## Logging and monitoring

- Structured pino logs; request logging via pino-http.
- Health endpoint performs a live database check.

## Production readiness (pending external inputs)

- Deployment host, TLS, backups, monitoring, legal/provider review, and operator approvals are not configured.
- Production deployment requires explicit authorization.
