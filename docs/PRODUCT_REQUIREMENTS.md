# Product Requirements

## Core Workflows

### Teacher
1. Apply and receive admin approval.
2. Create a course, sections, lessons, videos, and quizzes.
3. Submit the course for review.
4. Respond to feedback and publish after approval.
5. View enrollments and earnings.
6. Request payouts.

### Student
1. Register and browse courses.
2. Purchase a course.
3. Pay through KBZPay/WavePay and submit transaction details and receipt.
4. Wait for admin verification.
5. Access lessons after approval.
6. Complete quizzes and earn a certificate.

### Admin
1. Approve teacher applications.
2. Review and publish courses.
3. Verify actual wallet transactions.
4. Approve or reject payment submissions.
5. Manage refunds, earnings, and payouts.

## Acceptance Criteria
- Teachers can edit only their own courses.
- Only approved teachers can submit courses.
- Only admin-approved courses can be published.
- Screenshots alone never trigger payment approval.
- Unverified purchases never grant paid access.
- Duplicate approvals never create duplicate enrollments or earnings.
- Students cannot access paid lessons without valid enrollment.
- Certificates are issued only after server-verified completion.
- All payment, publication, and payout decisions are auditable.

## Out of Scope
Automated wallet integration, subscriptions, native apps, live classes, and instructor self-service payouts.
