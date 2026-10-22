# Progress

## Current State

- **Current task:** None.
- **Most recently completed task:** T002 — Application foundation (DONE).
- **Verified state:** Runnable npm workspace. `backend/` (Express 5, Prisma 7, Zod, pino) and `frontend/` (React 19, Vite 8, Tailwind 4) both install, lint, type-check, build, and test cleanly. `GET /api/v1/health` reports live database reachability. Root `npm run verify` passed with 14 backend and 7 frontend tests green.
- **Important unfinished work:** T003 (authentication and authorization) is the next deliverable. All marketplace features, file controls, and payments remain unimplemented. Operator-dependent provider and policy decisions still have gates in `PROJECT.md`.
- **Blockers:** None. The `micro_skill` PostgreSQL role requires `CREATEDB` and explicit `public` schema grants on each target database.
- **Recommended next task:** T003 — Authentication and authorization.
- **Preserve:** Pre-existing user documentation content; only task-related edits were made. No commit or deployment is authorized.

## Recent Notes

### October 22, 2026 — T002 complete

- Created the npm workspace root plus `backend/` and `frontend/` manifests, and installed all dependencies.
- Backend: Zod-validated environment loading that fails fast at startup, pino structured logging with `pino-pretty` in development, a centralized error handler, response helpers, and Express 5 with helmet and CORS.
- Implemented `GET /api/v1/health` with a real `SELECT 1` reachability check and latency measurement.
- Added minimal Prisma `User`/`UserRole` models, generated the Prisma 7 client into `src/generated/prisma`, applied the initial migration to `micro_skill_dev`, and deployed it to `micro_skill_test`.
- Frontend: React 19 + Vite 8 + Tailwind 4 app shell, typed API client that unwraps the envelope, and a live health panel rendered through the Vite `/api` proxy.
- Documented the response contract in `docs/API_CONVENTIONS.md` and setup/commands in `docs/SETUP.md`.
- Fixed several module-resolution defects: wrong relative import depth in the backend test and in `src/shared/database/prisma.ts`, and `../config/env.js` imports that needed `../../config/env.js`.
- Fixed a `pino-http` CommonJS interop issue by switching to the named `pinoHttp` export, and added the missing `pino-pretty` dependency.
- Frontend tests caught two real client bugs: an unsafe type narrowing on the response union and an unhandled `SyntaxError` on an empty error body. Both were fixed by parsing the body defensively and narrowing with type guards.
- Corrected `.gitignore`, which was excluding `backend/.env.test.example` because of the `.env.*` pattern, and added a Prettier config plus ignore file so pre-existing product documents are not reformatted.
- Final review found `package-lock.json` was also ignored, which would have made installs non-reproducible and broken `npm ci`. Removed it from `.gitignore` and `.prettierignore`, and documented `npm ci` in `docs/SETUP.md`. Verified a clean `npm ci` reinstall followed by a clean `npm run verify`.
- **Checks:** Root `npm run verify` (format:check, lint, typecheck, test, build) passed, twice, including after a clean `npm ci` reinstall. Backend: 14 tests, typecheck, lint, and build passed; server started and returned `200` with a live database check. Frontend: 7 tests, typecheck, lint, and production build passed. Prisma `generate` and `migrate status` both clean ("Already in sync"). Vite dev server served the app and proxied `/api/v1/health` to the backend with `200`. A stale process from an earlier session was found holding port 4000 and serving an outdated response shape; it was terminated and the correct build re-verified.
- **Known issue:** `npm ci` prints a warning that `@prisma/engines`, `esbuild`, and `prisma` install scripts are not covered by `allowScripts`. The build, Prisma generation, and tests all still pass afterwards, so this is informational for now; approve the scripts if a future environment needs them.
- **Result:** T002 DONE. T003 is ready but was not started. No commit, deployment, or production data change.

### October 22, 2026 — T001 complete

- Selected Express/TypeScript, retaining the established planned stack; corrected the implementation roadmap and mapped phases to one-task-per-session tracking.
- Retained private local filesystem storage outside the web root on a persistent volume. Documented single-host constraints, API-authorized downloads, validation, and database-plus-file backup requirements. Video delivery remains managed externally.
- Selected PostgreSQL-backed opaque cookie sessions and same-origin HTTPS deployment. Documented CSRF/origin checks, secure cookie flags, rotation/revocation, expiry, trusted proxies, reset delivery, and deferred dependency selection. Reviewed primary Express/OWASP guidance; no dependency was installed.
- Updated `README.md`, `PROJECT.md`, `TASKS.md`, and the architecture, implementation, data/API, and security documents. Product requirements were preserved. Deferred providers, financial/completion rules, and operational approvals have explicit gating tasks; no production policy values were invented.
- **Checks:** Read back edited documents and searched the repository for stale stack/storage/authentication references and task statuses/dependencies. Final `git diff --check` passed and `git status --short` confirmed eight task-related modified documents. Initial combined status/inventory command returned no observable completion, but standalone Git checks succeeded. No runnable application/test setup exists, so runtime tests/builds were not applicable.
- **Result:** T001 DONE. T002 is ready but was not started. No commit, deployment, or application code change.

### October 22, 2026 — Project-management setup

- Inspected the README, all five design documents, repository structure, and Git status/history.
- Created `PROJECT.md`, `TASKS.md`, and `PROGRESS.md` as the durable management and handoff records.
- Recorded 13 dependency-ordered deliverables, all `TODO`, with expected results and practical completion checks.
- Preserved existing design documents and README changes. Recorded conflicts rather than changing architecture or selecting providers in this setup task.
- Kept scope to tracking setup. T001 and application implementation have not started.
- **Verification:** Read back all three created files and reviewed the 13 unique ordered task IDs, required fields, TODO statuses, dependencies, and handoff consistency. Initial repository inspection confirmed no application/test configuration. Automated task/whitespace checks, `git diff --check`, and post-change documentation checksum verification were attempted twice, but terminal integration did not return observable completion or results; these checks remain unverified. Only the three new tracking files were targeted by the successful patch. No runtime tests apply to these documentation-only additions.
- **Next:** Start T001 in a subsequent task/session. Mark it `IN PROGRESS` before making its changes, and stop after its checks and handoff.