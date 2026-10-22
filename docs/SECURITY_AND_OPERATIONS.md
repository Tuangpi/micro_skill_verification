# Security and Operations

- Hash passwords securely and rate-limit authentication.
- Enforce role-based permissions and resource ownership on the server.
- Require actual wallet transaction verification before approving payments.
- Keep payment receipts in private storage.
- Validate uploaded files and enforce size limits.
- Protect video playback using signed URLs or provider access controls.
- Use HTTPS and keep secrets out of source control.
- Prevent duplicate payment approval, enrollment, and earnings creation.
- Record financial changes as auditable ledger entries.
- Teachers cannot approve payments or edit their earnings.
- Only eligible students can receive certificates.
- Collect minimal personal information and define retention policies.
- Obtain commercial rights for all course videos and resources.
- Publish terms, teacher agreements, and refund policies.
- Configure database backups, error monitoring, and production logging.
- Test backup restoration before launch.
- Check applicable Myanmar business, privacy, tax, and payment-provider requirements.

## Payment Process
1. Student creates a purchase.
2. Student pays through displayed wallet instructions.
3. Student submits transaction reference and receipt.
4. Admin verifies the actual received funds.
5. Admin approves or rejects the submission.
6. Approval grants enrollment exactly once.
7. The system records the sale and teacher earnings.
8. Admin records payouts and transaction references.
