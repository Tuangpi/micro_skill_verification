# Architecture

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **UI Components:** shadcn/ui, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **API:** REST API with versioned routes (`/api/v1`)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Request Validation:** Zod
- **Frontend Data Fetching:** TanStack Query
- **Forms:** React Hook Form + Zod
- **Video:** Managed video hosting with protected playback and access controls
- **Storage:** Private local server filesystem outside the web root, on a persistent volume
- **Authentication:** PostgreSQL-backed server sessions with secure cookies and server-side authorization
- **API Documentation:** OpenAPI / Swagger
- **Testing:** Vitest, Supertest, Playwright
- **Languages:** Burmese and English, with a responsive UI for desktop, tablet, and mobile devices

## Backend Modules

Organize the backend as a modular monolith with clearly separated business modules:

- **Authentication and Authorization:** Registration, login, session management, password reset, and role-based access control.
- **Teacher Management:** Teacher profiles, applications, approval, and account status.
- **Course Catalog and Content Management:** Course creation, categories, pricing, lessons, video resources, and publishing.
- **Course Moderation:** Course review, approval, rejection, and publication controls.
- **Purchases and Payment Verification:** Purchase records, payment instructions, receipt uploads, and manual payment approval or rejection.
- **Enrollment and Lesson Progress:** Student enrollment, course access, lesson completion, and learning progress.
- **Quizzes and Certificates:** Quiz attempts, scoring, completion requirements, certificate generation, and public certificate verification.
- **Teacher Earnings and Payouts:** Revenue allocation, platform commission, earnings balances, payout requests, and payout history.
- **Admin Reporting and Audit Logs:** Sales reports, enrollment statistics, payment reports, administrative activity, and financial audit trails.

Each module should own its business rules and expose clearly defined interfaces to other modules.

## Design Rules

- Use a **modular monolith**. Do not introduce microservices for the MVP.
- Keep Express route handlers thin. Put business logic in service modules and database operations in dedicated repositories or data-access modules where useful.
- Separate routes, controllers, services, validation schemas, and data-access logic.
- Enforce authentication, role permissions, resource ownership, and course access on the backend.
- Validate and sanitize all incoming requests using Zod or equivalent server-side validation.
- Use PostgreSQL transactions for payment approval, enrollment activation, earnings allocation, and payout-related financial updates.
- Never trust client-supplied prices, roles, payment statuses, completion statuses, or earnings. Calculate or verify them on the server.
- Make payment approval and other critical operations idempotent where appropriate to prevent duplicate financial records or enrollments.
- Store payment receipts on private local storage outside the web root. Restrict uploads by file type and size, and authorize receipt access.
- Protect course videos using signed playback URLs or equivalent provider-supported access controls.
- Store secrets and environment-specific configuration in environment variables. Validate required configuration during application startup.
- Apply centralized error handling, structured logging, and consistent API response formats.
- Maintain audit logs for administrative actions and important financial operations.
- Use database migrations to manage schema changes.
- Keep frontend presentation logic separate from backend business rules.
- Support Burmese and English text, Unicode-compatible storage, localized dates and numbers, and responsive layouts.

## Frontend Areas

- **Public Catalog:** Homepage, course listing, category browsing, search, course details, and instructor profiles.
- **Authentication:** Registration, login, password reset, and account settings.
- **Student Dashboard:** Purchased courses, learning progress, quizzes, certificates, and account information.
- **Teacher Dashboard:** Course management, lesson builder, student statistics, earnings, and payout requests.
- **Admin Dashboard:** User management, teacher approval, course moderation, payment verification, reporting, and audit logs.
- **Course Player:** Protected video playback, lesson navigation, progress tracking, and course resources.
- **Payment Submission:** Payment instructions, receipt upload, payment status, and purchase history.
- **Payment Review:** Admin review queue, receipt inspection, approval, rejection, and reason tracking.
- **Quiz Interface:** Quiz attempts, answer submission, scoring, and retry rules.
- **Certificates:** Certificate display, printable certificate, and public verification page.
- **Localization:** Burmese/English language switching and translated interface content.

## Suggested Project Structure

### Frontend

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── layouts/
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── features/
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── student/
│   │   ├── teacher/
│   │   ├── admin/
│   │   ├── payments/
│   │   ├── quizzes/
│   │   └── certificates/
│   ├── hooks/
│   ├── lib/
│   ├── locales/
│   │   ├── en/
│   │   └── my/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── tests/
├── .env.example
├── package.json
└── vite.config.ts
```

### Backend

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── teachers/
│   │   ├── courses/
│   │   ├── moderation/
│   │   ├── purchases/
│   │   ├── payments/
│   │   ├── enrollments/
│   │   ├── progress/
│   │   ├── quizzes/
│   │   ├── certificates/
│   │   ├── earnings/
│   │   ├── payouts/
│   │   └── reports/
│   ├── middleware/
│   ├── routes/
│   ├── shared/
│   │   ├── errors/
│   │   ├── logger/
│   │   ├── validation/
│   │   └── utils/
│   ├── app.ts
│   └── server.ts
├── tests/
├── .env.example
├── package.json
└── tsconfig.json
```

Each backend module should contain its own routes, controller or handler, service, validation schemas, and data-access code as needed. Avoid creating empty boilerplate files before the corresponding feature is implemented.

## Architectural Boundaries

- The **frontend** handles presentation, navigation, forms, and API interaction.
- The **Express API** handles validation, authentication, authorization, business rules, and response formatting.
- **Services** coordinate business operations and transactions.
- **Prisma** provides typed database access to PostgreSQL.
- **PostgreSQL** is the source of truth for users, courses, purchases, enrollments, learning progress, and financial records.
- **Managed video hosting and private local file storage** handle media delivery and private file bytes separately from the main application database.

The architecture must support multiple instructors, secure course ownership, manual payment verification through local payment methods such as KBZPay and WavePay, protected course access, certificates, and auditable instructor earnings.

## MVP Decisions — October 22, 2026 (T001)

These decisions are implementation requirements, not claims of working code. No package versions or additional authentication/storage dependencies are selected here.

### Backend and Deployment

Use Node.js/Express and TypeScript, not Laravel, matching the README and architecture. Keep the frontend and backend separate in source and build output, but serve them through one HTTPS origin in production, routing `/api/v1` to Express. Use a development proxy for the same API path. Cross-origin deployments require a separate security review rather than permissive credentialed CORS.

### Authentication

Use opaque session IDs in cookies and PostgreSQL-backed server-side session records. This is the chosen MVP approach for central logout/revocation without introducing another datastore. Do not store bearer credentials in browser local storage. Select and verify compatible session middleware/store dependencies during T003; the table list in `DATA_MODEL_AND_API.md` is conceptual, not a prescribed adapter schema.

- Set production cookies to `HttpOnly`, `Secure`, and `SameSite=Lax`, host-only (no Domain attribute), with Path `/`. Require HTTPS; any insecure cookie exception is limited to local development.
- Protect state-changing requests, including authentication and uploads, with server-validated CSRF tokens and trusted-origin checks. SameSite alone is not the CSRF defense; GET requests must not mutate state.
- Regenerate session IDs on login and privilege changes. Destroy sessions on logout; invalidate affected sessions after password reset or account suspension. Read current account status and permissions on protected requests rather than trusting stale role claims.
- Enforce configurable idle and absolute expiration server-side and clean expired records. T003 must select and test concrete defaults, secure password hashing, rate limiting, reset-token expiry, and single use.
- Keep session secrets in environment configuration. Trust only the configured reverse-proxy boundary for HTTPS/client-IP detection, not arbitrary forwarded headers. Do not use an in-memory production session store.
- Plan password-reset delivery with the operator before T003 is complete; never expose reset tokens in production responses or logs.

### Private File Storage

Retain the README's local filesystem choice for the small MVP deployment rather than introducing an object-storage provider. Use one application host with a persistent private volume; ephemeral/serverless filesystem deployment is not supported by this plan. Horizontal scaling requires shared private storage or a reviewed object-storage migration first.

- Keep file bytes outside static/public directories and source control. Store only file metadata, ownership, and generated storage keys in PostgreSQL; never accept user-controlled filesystem paths.
- Authorize upload/download through the API. Owners may view their own receipts and administrators may review them; teachers and unrelated students must not access receipts. Course resources require ownership or valid enrollment as appropriate.
- Use generated filenames, type/size allowlists and content validation, path-traversal protection, least-privilege filesystem permissions, and safe download headers. Define exact limits in T005/T007.
- Back up and restore the private volume together with database metadata; define cleanup/retention and disk-capacity monitoring before launch. Do not imply database backups include file bytes.
- Keep course video delivery on the managed video provider; do not use this volume as public video hosting.

### Guidance Reviewed

Primary guidance reviewed for these requirements: Express session middleware documentation and OWASP Session Management and File Upload cheat sheets. Locate the current official documentation before implementing library-specific configuration; no middleware API has been fixed by this design.
