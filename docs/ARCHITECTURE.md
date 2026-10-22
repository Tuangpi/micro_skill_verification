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
- **Storage:** Private object storage for payment receipts and other private files
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
- Store payment receipts in private object storage. Restrict uploads by file type and size, and authorize receipt access.
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
- **Video hosting and object storage** handle media delivery and private file storage separately from the main application database.

The architecture must support multiple instructors, secure course ownership, manual payment verification through local payment methods such as KBZPay and WavePay, protected course access, certificates, and auditable instructor earnings.
