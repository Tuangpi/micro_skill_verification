# Implementation Plan

These phases are a roadmap, not session-sized tasks. `TASKS.md` is the execution/status source of truth: select one ready tracked task per session, verify it, update `PROGRESS.md`, and stop. T001 aligns decisions; Phase 1 maps to T002–T003, Phase 2 to T004–T006, Phase 3 to T007, Phase 4 to T008–T009, Phase 5 to T010–T011, and Phase 6 to T012–T013. Apply security, localization, and auditing during feature work.

## Phase 1: Foundation
- Set up React/Vite, Node.js/Express, TypeScript, PostgreSQL/Prisma, and environments.
- Configure migrations, testing, linting, and authentication.
- Implement roles and permissions.

## Phase 2: Teachers and Courses
- Build teacher applications and admin approval.
- Implement course, section, and lesson management.
- Add media uploads and course moderation.
- Build the public catalog.

## Phase 3: Payments
- Create purchases and price snapshots.
- Add KBZPay/WavePay instructions and receipt submissions.
- Implement admin verification and duplicate detection.
- Grant enrollment only after approval.

## Phase 4: Learning
- Implement protected video lessons.
- Track progress.
- Add quizzes, scoring, and certificates.
- Add certificate verification.

## Phase 5: Teacher Finance
- Implement earnings ledger and commission calculation.
- Add earnings dashboard and admin-managed payouts.
- Add refund adjustments and audit logs.

## Phase 6: Testing and Launch
- Test mobile layouts and Burmese text.
- Test payment workflows and access controls.
- Configure backups, monitoring, and deployment.
- Pilot with 3–5 teachers and 10–30 paying students.

## Coding-Agent Rules
1. Read all files in `/docs` before coding.
2. Inspect the existing repository before changing files.
3. Implement one ready task from `TASKS.md` at a time; do not implement a whole phase automatically.
4. Write tests for business rules and authorization.
5. Run relevant available tests and builds after each tracked implementation task.
6. Never implement fake production payment confirmation.
7. Do not introduce unnecessary infrastructure.
8. Do not begin advanced features before MVP acceptance criteria pass.
9. Report changed files, tests, failures, and remaining work after each task; update tracking before stopping.

## Continuing with Cline
Read the saved project state, resume an active task first, or choose the first unblocked TODO with completed dependencies. Do not start course, payment, or marketplace features until their foundation dependencies pass their checks. Production payment approval is not complete until T010 integrates transactional earnings; intermediate T007 work is not production-ready.
