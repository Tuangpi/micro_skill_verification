# Video Provider Decision (T005)

Status: **Deferred to operator approval** (gate T005 in `PROJECT.md`).

## Current implementation

- Lessons store opaque fields: `videoProvider` (default `external_url`) and `videoRef` (URL or provider reference).
- No provider-specific upload, signing, or playback integration is implemented.
- Private local storage (`STORAGE_ROOT`) is used only for non-video media assets (images/PDFs) and payment receipts; course video delivery is intentionally **not** hosted on this volume.

## Candidate approaches

- Managed video hosting with signed/protected playback URLs (recommended for production).
- Self-hosted segmented video behind API-authorized short-lived URLs (higher ops burden).

## Required before implementation

- Operator selects provider and approves cost/limits.
- Confirm protected playback authorization and URL expiry behavior (T008).
- Document upload limits, allowed formats, and verification limits.

Until then, teacher authoring uses external video references only.
