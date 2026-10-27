# Teacher Earnings Rules

- Earnings are recorded as an append-only ledger (`teacher_earnings`). Balances are derived from the sum of ledger entry amounts.
- When an admin approves a payment submission, a single `SALE` entry is created for the course teacher inside the same transaction as enrollment. Duplicate approvals never create duplicate earnings.
- Platform commission is calculated in integer MMK using basis points. The default rate is 2000 bps (20%); the teacher receives the remaining 80%. The rate is snapshotted on each sale entry.
- Commission and teacher amounts are computed as `Math.round(gross * bps / 10000)` and `gross - commission` respectively, keeping all values as integer MMK.
- Adjustments (refunds, corrections, or manual credits) are recorded as signed `ADJUSTMENT` entries by an admin with a required note. Adjustments do not alter the original sale entry.
- Teachers can view only their own earnings summary and ledger history. Admins can view all entries and create adjustments.
- Refunds and access revocation are handled as adjustments plus (where applicable) enrollment changes by an admin; automated revocation is not performed by this task.
- Commission, rounding, refund, and access-revocation policies remain subject to operator confirmation before production use.
