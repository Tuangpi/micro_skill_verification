# Payout Rules

- Teachers may request payouts up to their available balance (ledger balance minus pending payout requests).
- Payout requests follow statuses: REQUESTED -> APPROVED/REJECTED -> PAID.
- Only admins approve, reject, or record payouts; no instructor self-service disbursement.
- Recording a payout creates a payout transaction, an auditable `PAYOUT` ledger entry, and reduces the teacher balance.
- Payout recording is idempotent and guarded against duplicate references and concurrent updates.
- Financial report totals are derived from ledger records.
