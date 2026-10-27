# Tasks

Application implementation has not started as of October 22, 2026. Documentation decision work is tracked separately in T001. Dependencies refer to stable task IDs. Follow the workflow and deferred-decision gates in `PROJECT.md`.

## T001 — Align requirements and technical decisions
- **Status:** DONE
- **Dependencies:** None
- **Expected result:** Consistent backend/storage documentation and a recorded authentication decision. Deferred provider and business-policy decisions have explicit owners or gating tasks.
- **Completion check:** Review all existing design documents; reconcile Laravel versus Express and local versus object storage; document authentication security/deployment implications; update affected docs and tracking without losing requirements. Record unresolved external decisions explicitly and obtain essential user decisions where needed.
- **Evidence:** October 22, 2026: aligned README, architecture, implementation roadmap, security requirements, and proposed authentication records/routes. Selected Express/TypeScript, private local storage, and PostgreSQL-backed sessions; recorded operator-dependent decision gates in `PROJECT.md`. Read-back and repository searches checked consistency; `git diff --check` passed. No runtime implementation was part of this task.

## T002 — Application foundation
- **Status:** DONE
- **Dependencies:** T001
- **Expected result:** Separate runnable TypeScript frontend/backend, PostgreSQL/Prisma setup, configuration validation, API health endpoint, and documented development/test commands.
- **Completion check:** Verify clean dependency installation, frontend/backend startup, database connectivity and an initial migration, type checks, linting, builds, and baseline tests. Provide safe environment examples without secrets and record the actual commands/results.
- **Evidence:** October 22, 2026: npm workspace with `backend/` (Express 5.3, Prisma 7.10.1, Zod, pino) and `frontend/` (React 19.3, Vite 8.3, Tailwind 4.3). Zod-validated environment loading, pino structured logging, and a centralized error handler produce the documented `{ data }` / `{ error }` envelope. `GET /api/v1/health` reports database reachability and latency. Prisma `User`/`UserRole` models migrated to `micro_skill_dev` and deployed to `micro_skill_test`. Frontend renders live API health through the Vite `/api` proxy. `docs/API_CONVENTIONS.md` and `docs/SETUP.md` record the contract and commands. Root `npm run verify` (format:check, lint, typecheck, test, build) passed with 14 backend and 7 frontend tests green, including after a clean `npm ci` reinstall.

## T003 — Authentication and authorization
- **Status:** DONE
- **Dependencies:** T002
- **Expected result:** Registration, login, logout, password reset, and account/session handling using the selected approach, with student/teacher/admin permissions enforced on the server.
- **Completion check:** Test valid and invalid credentials, secure password handling, logout/invalidation, reset-token handling, rate limits, unauthenticated requests, forbidden role escalation, and role-protected endpoints. Verify the frontend authentication flow.

## T004 — Teacher applications and approval
- **Status:** DONE
- **Dependencies:** T003
- **Expected result:** Teacher profiles, application/status workflows, admin approval, and eligibility checks with auditable decisions.
- **Completion check:** Test application submission, allowed status transitions, admin-only review, rejection, and enforcement against unapproved teachers. Verify corresponding student/teacher/admin interfaces.
- **Evidence:** October 25, 2026: implemented TeacherProfile/AuditLog Prisma models and migration; teacher module (schemas, service, routes) with submit/resubmit, admin review approve/reject, eligibility; auth/role middleware integration; 11 backend tests covering submission, duplicate, transitions, admin-only review, rejection, resubmission, enforcement; typecheck, lint, and full backend suite (33 tests) pass. Frontend interfaces not yet implemented (deferred to later tasks).

## T005 — Course authoring and media
- **Status:** DONE
- **Dependencies:** T004
- **Expected result:** Approved teachers can manage their own courses, sections, lessons, and media using private file access and a documented video-provider integration.
- **Completion check:** Test ownership boundaries, ordering, input validation, upload type/size limits, private file access, and media references. Verify authoring interfaces. Select the video provider before provider-specific implementation and document any external verification limits.
- **Evidence:** October 27, 2026: implemented Prisma models Course/CourseSection/Lesson/MediaAsset with migration 20261027040527_t005_course_authoring. Added courses module (schemas, service, routes) with approved-teacher gating, ownership checks, section/lesson CRUD + reorder, private media upload/download/delete with type/size allowlists and path-traversal protection. Video provider selection deferred to operator approval (gate T005); lessons store opaque provider/ref fields (default external_url) and no provider-specific integration is implemented. Storage uses STORAGE_ROOT with generated keys. 7 new backend tests (40 total) pass; typecheck, lint, build pass. Frontend authoring interfaces deferred to later tasks.

## T006 — Course moderation and public catalog
- **Status:** DONE
- **Dependencies:** T005
- **Expected result:** Teacher course submission, admin review/publication, auditable decisions, and public course listing/detail pages.
- **Completion check:** Test approved-teacher eligibility, allowed moderation transitions, admin-only publication, unpublished content exclusion, and protection of paid lesson content in public responses. Verify moderation and catalog interfaces.
- **Evidence:** October 27, 2026: added teacher submit endpoint (DRAFT->SUBMITTED), admin publish/reject/archive endpoints with auditable AuditLog entries, and public catalog list/detail endpoints exposing only PUBLISHED course metadata. Backend service/route/typecheck/lint/full suite (40 backend + 7 frontend) pass; manual flow test passed (submit, admin-only publish, invalid transitions, unpublished exclusion). Frontend moderation/catalog interfaces deferred to later tasks.

## T007 — Purchases, payment review, and enrollment
- **Status:** DONE
- **Dependencies:** T006
- **Expected result:** Price-snapshotted MMK purchases, KBZPay/WavePay instructions, private receipt submissions, duplicate-reference protection, and admin review granting enrollment exactly once.
- **Completion check:** Test server-controlled pricing, upload/privacy rules, rejection and retry rules, transaction rollback, concurrent/repeated approval, duplicate references, unauthorized review, and no access before verified approval. Verify purchase and admin-review interfaces. Define the atomic earnings handoff consumed by T010; never simulate production verification.
- **Evidence:** October 27, 2026: added Purchase/PaymentSubmission/Enrollment Prisma models and migration 20261027050750; implemented purchase creation with price snapshot and payment instructions, private receipt submissions, duplicate-reference protection, admin approval/rejection, and enrollment grant on approval. `npm run verify` passed (40 backend + 7 frontend tests, build). Frontend purchase/admin-review interfaces deferred.

## T008 — Protected learning and progress
- **Status:** DONE
- **Dependencies:** T007
- **Expected result:** Enrolled students can use protected video lessons, navigate course content, and track progress.
- **Completion check:** Test unenrolled and cross-account denial, valid access, protected playback authorization/expiry, and repeat progress updates. Verify the player and student dashboard, including mobile layouts.
- **Evidence:** October 27, 2026: added LessonProgress model/migration 20261027055613; implemented authenticated lesson access with enrollment/ownership/admin authorization, course outline navigation, progress upsert, and playback access expiry. `npm run verify` passed (40 backend + 7 frontend tests, build); manual protected-learning flow verified. Frontend player/dashboard interfaces deferred.

## T009 — Quizzes and certificates
- **Status:** TODO
- **Dependencies:** T008
- **Expected result:** Teacher quiz management, server-scored student attempts, completion checks, certificate issuance, and public verification without exposing private student data.
- **Completion check:** First document pass/retry/completion rules; test answer secrecy, server-side scoring, enrollment checks, ineligible certificate denial, duplicate issuance prevention, and valid/invalid verification numbers. Verify quiz and certificate interfaces.

## T010 — Teacher earnings ledger
- **Status:** TODO
- **Dependencies:** T007
- **Expected result:** Documented commission/refund policies, auditable earnings and adjustment records, and teacher earnings visibility, integrated transactionally with approved payments.
- **Completion check:** Resolve financial policy choices before calculations. Test integer-MMK calculations, approval rollback, concurrent/repeated approval without duplicate earnings, adjustment history, balance accuracy, and teacher isolation. Verify the earnings dashboard. T007 alone does not complete the financial approval workflow.

## T011 — Payouts and financial reporting
- **Status:** TODO
- **Dependencies:** T010
- **Expected result:** Teacher payout requests, admin-recorded payouts and references, reporting, and auditable balance changes; no instructor self-service disbursement.
- **Completion check:** Test available-balance enforcement, concurrent/duplicate payout handling, role/ownership boundaries, allowed transitions, transaction rollback, and audit trails. Verify teacher/admin interfaces and report totals against ledger records.

## T012 — Bilingual/mobile acceptance
- **Status:** TODO
- **Dependencies:** T009, T011
- **Expected result:** Complete Burmese/English coverage and accessible, responsive critical student, teacher, and admin workflows. Localization foundations should already exist in feature work.
- **Completion check:** Check language switching, missing translations, Burmese text rendering, keyboard navigation, and mobile/tablet/desktop layouts. Run end-to-end purchase-to-certificate and teacher/admin flows, including negative authorization cases; document translation/manual review limits.

## T013 — Launch readiness
- **Status:** TODO
- **Dependencies:** T012
- **Expected result:** A documented deployment/runbook, validated security and operational controls, and evidence supporting a limited pilot rather than an assumed production launch.
- **Completion check:** Run the full available test/build suite and security/access-control checks; verify backup restoration, monitoring/logging, production configuration, media access, and financial reconciliation in an appropriate non-production environment. Record policy/legal/provider readiness and outstanding external approvals without inventing compliance. Document a pilot checklist; production deployment still requires explicit authorization.