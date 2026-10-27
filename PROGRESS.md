# Progress

## Current State

- **Current task:** None.
- **Most recently completed task:** T009 — Quizzes and certificates (DONE).
- **Verified state:** Runnable npm workspace with auth, teacher applications, course authoring, moderation, public catalog, purchases, payment review, enrollment, protected learning/progress, quizzes, and certificates. Backend tests 40, frontend 7. Full backend suite passes.
- **Important unfinished work:** Frontend quiz/certificate interfaces deferred; T010 not started.
- **Blockers:** None.
- **Recommended next task:** T010 — Teacher earnings ledger.
- **Preserve:** Pre-existing user documentation; only task-related edits.

### October 25, 2026 — T004 complete

- Implemented TeacherProfile and AuditLog Prisma models; migration applied (`20261025070233_t004_teacher_applications`).
- Added teacher module: schemas, service (submit/resubmit, getMy, list/get, approve/reject, isApprovedTeacher), routes (student + admin).
- Approval promotes user to TEACHER in a transaction and writes AuditLog; rejection audited.
- Added 11 backend tests covering submission, duplicate, admin-only review, rejection, resubmission, enforcement, eligibility.
- **Checks:** Backend typecheck, lint, and full test suite (33 tests) pass. `npm run verify` not run for frontend.
- **Result:** T004 DONE. T005 ready.


### October 25, 2026 — T003 complete

- Implemented auth module: scrypt password hashing (Node crypto), express-session + connect-pg-simple, manual double-submit CSRF, express-rate-limit on auth routes, role-protected admin endpoint.
- Added Prisma models: `Session`, `PasswordResetToken`; migration `20261025062515_t003_auth`.
- Endpoints: register, login, logout, session, csrf-token, password-reset-requests, password-resets, admin/ping.
- Frontend minimal auth flow: AuthPanel with register/login/logout/session check; typed client helpers.
- **Checks:** Full `npm run verify` passed (format, lint, typecheck, tests, build). Backend 22 tests, frontend 7 tests.
- **Result:** T003 DONE. T004 ready.
## Recent Notes

### October 27, 2026 — T009 complete

- Added Quiz/QuizQuestion/QuizAttempt/Certificate models and migration `20261027070600_t009_quizzes_certificates`.
- Documented pass/retry/completion rules in `docs/QUIZ_AND_CERTIFICATE_RULES.md`.
- Implemented teacher quiz/question management, student quiz view without answers, server-side scoring, retry limits, certificate issuance on pass + all lessons completed, duplicate prevention, and public verification.
- Typecheck, lint, and full verify pass (40 backend + 7 frontend tests, build). Manual quiz/certificate flow verified.
- **Result:** T009 DONE. T010 ready. Frontend quiz/certificate interfaces deferred.


### October 27, 2026 — T008 complete

- Added LessonProgress model and migration `20261027055613_t008_protected_learning_progress`.
- Implemented protected lesson access with enrollment/ownership/admin authorization, course outline navigation, progress upsert, and playback access expiry.
- Typecheck, lint, and full verify pass (40 backend + 7 frontend tests, build). Manual protected-learning flow verified.
- **Result:** T008 DONE. T009 ready. Frontend learning/player/dashboard interfaces deferred.


### October 27, 2026 — T007 complete

- Added Purchase, PaymentSubmission, and Enrollment Prisma models; migration `20261027050750_t007_purchases_payments_enrollments`.
- Implemented purchase creation with published-course lookup, price snapshot, payment instructions, and enrollment guard.
- Implemented payment submissions with private receipt upload, duplicate transaction-reference protection, admin approve/reject, and enrollment grant on approval.
- Typecheck, lint, and full verify pass (40 backend + 7 frontend tests, build). Manual purchase flow verified.
- **Result:** T007 DONE. T008 ready. Frontend purchase/admin-review interfaces deferred.


### October 27, 2026 — T006 complete

- Added teacher course submission endpoint (`POST /teacher/courses/:id/submit`) with approved-teacher gating and DRAFT->SUBMITTED transition.
- Added admin moderation endpoints (`POST /admin/courses/:id/publish|reject|archive`) with allowed transitions and AuditLog entries.
- Added public catalog endpoints (`GET /courses`, `GET /courses/:slug`) exposing only PUBLISHED course metadata.
- Typecheck, lint, and full test suite (40 backend + 7 frontend) pass; manual moderation/catalog flow verified.
- **Result:** T006 DONE. T007 ready. Frontend moderation/catalog interfaces deferred.


### October 27, 2026 — T005 complete

- Implemented Course/CourseSection/Lesson/MediaAsset Prisma models; migration `20261027040527_t005_course_authoring` applied to dev and test.
- Added courses module: schemas, service (approved-teacher gating, ownership, CRUD, reorder), routes, private file storage helper.
- Media uploads validated by type/size allowlist; private download authorized by owner/admin; path-traversal protected.
- Video provider selection deferred to operator (gate T005); lessons store opaque provider/ref fields.
- Added 7 backend tests; total 40 backend + 7 frontend. Typecheck, lint, build pass.
- **Result:** T005 DONE. T006 ready. Frontend authoring interfaces deferred.

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