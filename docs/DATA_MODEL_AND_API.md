# Database and API

## Main Tables
- `users`: accounts and roles.
- `teacher_profiles`: teacher details and approval status.
- `courses`: teacher-owned courses, prices, and publication status.
- `course_sections`: ordered course sections.
- `lessons`: video lessons and learning materials.
- `media_assets`: private files and video-provider references.
- `purchases`: student purchases and price snapshots.
- `payment_submissions`: wallet references, receipts, and review decisions.
- `enrollments`: authorized course access.
- `lesson_progress`: learning progress.
- `quizzes`, `quiz_questions`, `quiz_attempts`: assessments.
- `certificates`: issued certificates and verification numbers.
- `teacher_earnings`: auditable earnings ledger.
- `payout_requests`, `payout_transactions`: teacher payouts.
- `audit_logs`: administrative actions.

## API Prefix
`/api/v1`

## Core Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `GET /courses`
- `GET /courses/{slug}`
- `POST /purchases`
- `POST /purchases/{id}/payment-submissions`
- `GET /me/enrollments`
- `GET /lessons/{id}`
- `POST /lessons/{id}/progress`
- `POST /quizzes/{id}/attempts`
- `POST /teacher/courses`
- `PATCH /teacher/courses/{id}`
- `POST /teacher/courses/{id}/submit`
- `GET /teacher/earnings`
- `GET /admin/payment-submissions`
- `POST /admin/payment-submissions/{id}/approve`
- `POST /admin/payment-submissions/{id}/reject`
- `POST /admin/courses/{id}/publish`
- `POST /admin/payout-requests/{id}/record-payment`
- `GET /certificates/{number}/verify`

## Rules
- Use foreign keys, indexes, and unique constraints.
- Store MMK as integer amounts.
- Snapshot prices at purchase time.
- Prevent duplicate transaction references and financial entries.
- Use transactions for approvals and payouts.
- Store quiz answers securely on the server.
- Enforce ownership and enrollment checks on every protected endpoint.
