# Implementation Plan

## Phase 1: Foundation
- Set up React, Laravel, PostgreSQL, and environments.
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
3. Implement one phase at a time.
4. Write tests for business rules and authorization.
5. Run tests and builds after each phase.
6. Never implement fake production payment confirmation.
7. Do not introduce unnecessary infrastructure.
8. Do not begin advanced features before MVP acceptance criteria pass.
9. Report changed files, tests, failures, and remaining work after each phase.

## First Task for Cline
Inspect the repository and documentation. Implement Phase 1 only. Do not start course, payment, or marketplace features until the foundation passes its tests.
