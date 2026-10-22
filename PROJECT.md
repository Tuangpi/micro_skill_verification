# Project

## Goal

Build the Myanmar Micro-Course & Skill Verification Portal: a mobile-first Burmese/English learning marketplace where approved teachers publish courses, students purchase access through manually verified KBZPay/WavePay payments, and eligible learners earn verifiable certificates.

Initial launch target: 3–5 teachers, courses in graphic design, video editing, and digital marketing, and a pilot with 10–30 paying students.

## Scope

- Student, teacher, and administrator accounts with server-enforced authorization.
- Teacher applications and approval; teacher-owned course, section, lesson, and quiz management.
- Admin course moderation and a public catalog.
- Purchases, private payment receipts, actual wallet transaction verification, and enrollment after approval.
- Protected lessons, progress tracking, server-scored quizzes, and verifiable certificates.
- Auditable teacher earnings, commission, adjustments, and admin-managed payouts.
- Burmese/English interfaces, responsive layouts, operational checks, and launch preparation.

Out of scope: automated wallet integration, subscriptions, native apps, live classes, instructor self-service payouts, and microservices for the MVP.

## Verified Repository State

As of October 22, 2026, the repository contains a README and five design documents. No application code, dependency manifests, database schema, test setup, or deployment configuration exists. All application features and technologies below are planned, not implemented or runtime-verified.

Existing README changes and untracked documentation predate management setup and must be preserved.

## Planned Stack and Architecture

- Separate frontend and backend, using TypeScript throughout.
- Frontend: React, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, and Zod.
- Backend: Node.js/Express modular monolith, versioned REST API at `/api/v1`, PostgreSQL, Prisma, and Zod.
- Tests: Vitest, Supertest, and Playwright. Exact scripts and versions will be established during foundation setup.
- Managed video hosting with protected playback; provider is not selected.
- OpenAPI/Swagger API documentation.
- Private local file storage outside the web root on a persistent volume; managed hosting remains responsible for video delivery.
- PostgreSQL-backed cookie sessions; same-origin HTTPS deployment of frontend and API.

T001 selected Express/TypeScript, private local storage, and server-side sessions on October 22, 2026. The implementation plan now matches these decisions. Keep a single application host with persistent file storage for the MVP; horizontal scaling or ephemeral hosting requires a storage review. See `docs/ARCHITECTURE.md` for session, CSRF, proxy, file-access, and backup requirements. Do not install packages or select versions solely from these planning notes; verify compatibility during implementation.

Backend services own business rules and transactions. PostgreSQL is the source of truth for accounts, course access, learning records, and finances. The frontend must not decide prices, roles, payment approval, completion eligibility, or earnings.

## Critical Requirements

- Enforce roles, resource ownership, and enrollment on the server.
- Only approved teachers may submit courses; only admin-approved courses may be published.
- Screenshots alone never approve payments; admins must verify actual received funds.
- Unverified purchases must never grant paid access.
- Payment approval, enrollment activation, and earnings allocation must be transactional and idempotent.
- Store MMK as integer amounts and snapshot purchase prices.
- Keep receipts private, validate uploads, and protect video playback.
- Score quizzes and determine certificate eligibility on the server.
- Audit payment, publication, financial adjustment, and payout decisions.
- Apply localization, accessibility, security, and auditing within relevant features, not just at launch.
- Never commit secrets or use fake production payment confirmations.

## Deferred Decisions and Gates

The implementing task owns technical selection; operator decisions must be requested before policy-dependent behavior is finalized. Do not invent production values or treat these as blockers to unrelated foundation work.

| Decision | Gate and responsible task |
| --- | --- |
| Runtime/package versions, package manager, local database setup | T002: verify compatibility and document reproducible commands before foundation completion. |
| Session middleware/store, expiration defaults, reset delivery provider/channel | T003: verify dependencies and confirm delivery with the operator before authentication completion. |
| Video hosting provider, playback integration, upload limits | T005: operator approves provider/cost; implementation verifies protected playback. T008 verifies learner access. |
| Wallet recipient details, receipt/reference rules and retry limits | T007: operator supplies valid payment instructions and review policy before real payment use. |
| Quiz pass marks, retries, required lessons, certificate eligibility | T009: operator confirms policy before completion/scoring rules are finalized. |
| Commission, rounding, refund policy and access revocation | T010: operator confirms policy before financial calculations. Coordinate purchase/earnings snapshots with T007; no real payment workflow is production-ready until integrated. |
| Payout minimums, eligibility and review rules | T011: operator confirms before payout behavior is finalized. |
| Translation approval | T012: operator or qualified reviewer approves Burmese/English content; report any review gaps. |
| Deployment host, backup/restore targets, retention, monitoring, agreements and applicable legal/provider review | T013: operator supplies deployment/policy approvals; verify operational controls before pilot readiness. No compliance assumption or deployment authorization is implied. |

## Detailed Requirements

Existing detailed documents remain in place. Paths below are relative to this project root:

- `README.md`: project overview and planned stack.
- `docs/PRODUCT_REQUIREMENTS.md`: role workflows, acceptance criteria, and exclusions.
- `docs/ARCHITECTURE.md`: architecture, module boundaries, and suggested structure.
- `docs/DATA_MODEL_AND_API.md`: proposed entities, routes, and data integrity rules.
- `docs/SECURITY_AND_OPERATIONS.md`: security controls and payment workflow.
- `docs/IMPLEMENTATION_PLAN.md`: phase roadmap mapped to the tracked tasks in `TASKS.md`.

These are design inputs, not evidence that features work. Resolve inconsistencies explicitly rather than silently treating one document as implemented truth.

## Project Workflow

- `PROJECT.md` owns goals, architecture, constraints, and important decisions.
- `TASKS.md` owns stable task IDs, dependencies, status, expected results, and checks.
- `PROGRESS.md` owns current state, blockers, recent evidence, and handoff notes.
- Resume an `IN PROGRESS` task first; otherwise choose the first unblocked `TODO` whose dependencies are complete.
- Mark the selected task `IN PROGRESS` before implementation. Implement only that task and required dependencies.
- Mark `DONE` only with completion evidence; use `BLOCKED` when work cannot proceed and record the reason.
- Update task status and progress before ending each managed task. Stop after that task and identify, but do not start, the next one.
- Preserve completed history and IDs. Revise affected plans when requirements materially change.
- Do not commit, push, deploy, or release unless explicitly requested.