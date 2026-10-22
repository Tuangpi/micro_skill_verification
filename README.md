# Myanmar Micro-Course & Skill Verification Portal

## Goal
Build a mobile-first, bilingual (Burmese and English) learning marketplace for Myanmar students and beginners. Approved teachers can create and manage courses. Students purchase courses through manual KBZPay/WavePay payment verification, learn online, complete quizzes, and earn verifiable certificates.

## User Roles
- **Admin:** Manage teachers, approve courses, verify payments, and manage payouts.
- **Teacher:** Create courses, upload lessons, build quizzes, and track earnings.
- **Student:** Purchase courses, learn, complete assessments, and earn certificates.

## MVP
- Authentication and role-based access.
- Teacher applications and approval.
- Teacher course and lesson management.
- Admin course moderation and publication.
- Course catalog and video lessons.
- Manual wallet-payment verification.
- Enrollment and learning progress.
- Quizzes and certificates.
- Teacher earnings and admin-managed payouts.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **UI:** shadcn/ui, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **API:** REST API with versioned routes (`/api/v1`)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Frontend data fetching:** TanStack Query
- **Forms:** React Hook Form + Zod
- **Authentication:** Secure session or token-based authentication with role-based authorization
- **Video:** Managed video hosting with protected playback
- **Storage:** Local server filesystem
- **Testing:** Vitest, Supertest, Playwright

The application must support three primary roles: students, instructors, and administrators. The architecture must support multiple instructors, course ownership, manual payment verification, student enrollment, quizzes, certificates, and instructor earnings.

Keep frontend and backend separate, use TypeScript throughout, validate all API inputs on the server, and enforce authorization on every protected resource.

## Initial Launch
Start with 3–5 teachers and three courses: graphic design, video editing, and digital marketing. Validate demand before expanding.
