# API Conventions

This document defines the request/response contract shared by the Express 5 backend and the React frontend. It is the source of truth for envelope shape, error codes, status codes, and versioning. Any new endpoint must follow these rules.

## Base URL and versioning

- All API routes are served under a versioned prefix: `/api/v1`.
- The prefix is defined by the `API_PREFIX` environment variable and defaults to `/api/v1`.
- Breaking changes require a new prefix (`/api/v2`). Additive, backward-compatible changes stay within `/api/v1`.

## Envelope

Every JSON response uses exactly one of two envelopes. There are no bare payload responses.

### Success

```json
{
  "data": { "status": "ok" }
}
```

- `data` holds the resource or result. It is always present, even when the value is `null`, `{}`, or `[]`.
- Metadata that is not part of the resource itself (pagination totals, for example) belongs in a sibling `meta` key rather than inside `data`.

### Failure

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "email", "message": "Must be a valid email address" }]
  }
}
```

- `error.code` is a stable, machine-readable, `SCREAMING_SNAKE_CASE` identifier. Clients branch on `code`, never on `message`.
- `error.message` is a human-readable summary. It may change without notice and must never be parsed by clients.
- `error.details` is optional and carries structured context (field-level validation problems, conflicting values). It is omitted entirely when not applicable.
- Internal stack traces, SQL messages, and driver errors are never exposed to clients. They are logged server-side and correlated by the request id.

## Status codes

| Code                        | Meaning                                              | Notes                                                         |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `200 OK`                    | Successful read or update                            | Returns `{ "data": ... }`                                     |
| `201 Created`               | Resource created                                     | Returns `{ "data": ... }` and a `Location` header             |
| `204 No Content`            | Successful action with no body                       | No envelope; use only when there is nothing to return         |
| `400 Bad Request`           | Malformed request                                    | `error.code` identifies the parse failure                     |
| `401 Unauthorized`          | Missing or invalid credentials                       | Includes an `WWW-Authenticate` header                         |
| `403 Forbidden`             | Authenticated but not permitted                      | Never used to hide the existence of a resource from its owner |
| `404 Not Found`             | Route or resource does not exist                     | Same envelope as every other error                            |
| `409 Conflict`              | State conflict, e.g. duplicate or invalid transition | `error.details` may carry the conflicting state               |
| `422 Unprocessable Entity`  | Semantically invalid payload                         | Field-level problems belong in `error.details`                |
| `429 Too Many Requests`     | Rate limit exceeded                                  | Includes `Retry-After`                                        |
| `500 Internal Server Error` | Unexpected server failure                            | Logged with a request id; details never exposed               |
| `503 Service Unavailable`   | Dependency unavailable, e.g. database down           | Used by the health endpoint when a dependency fails           |

## Error codes

Codes are grouped by cause. The following set is the baseline; new codes must be added to this list.

| Code                  | Typical status | Meaning                                                  |
| --------------------- | -------------- | -------------------------------------------------------- |
| `VALIDATION_ERROR`    | `422`          | Request body or query failed schema validation           |
| `INVALID_JSON`        | `400`          | Request body is not valid JSON                           |
| `NOT_FOUND`           | `404`          | Requested resource does not exist                        |
| `ROUTE_NOT_FOUND`     | `404`          | No route matches the request path and method             |
| `UNAUTHORIZED`        | `401`          | Authentication missing, expired, or invalid              |
| `FORBIDDEN`           | `403`          | Authenticated but lacking the required role or ownership |
| `CONFLICT`            | `409`          | Duplicate resource or invalid state transition           |
| `RATE_LIMITED`        | `429`          | Too many requests from the caller                        |
| `INTERNAL_ERROR`      | `500`          | Unexpected failure; see server logs                      |
| `SERVICE_UNAVAILABLE` | `503`          | A required dependency is not reachable                   |

## Endpoint: health check

`GET /api/v1/health`

Returns `200 OK` when the service and its database dependency are reachable, and `503 Service Unavailable` when the database check fails.

```json
{
  "data": {
    "status": "ok",
    "uptimeSeconds": 12.34,
    "timestamp": "2026-10-22T10:38:11.453Z",
    "checks": {
      "database": { "status": "up", "latencyMs": 3.21 }
    }
  }
}
```

- `status` is `ok` when every dependency is up and `degraded` when a non-critical dependency fails.
- `checks.database.status` is `up` or `down`.
- The health endpoint never requires authentication, so orchestrators can probe it.
- The health request is excluded from request logging to avoid log noise from probes.

## Frontend contract

The frontend wraps all calls in a single typed client, `frontend/src/api/client.ts`:

- `request<TData>(path, init)` performs the fetch, unwraps the `data` envelope, and returns the typed payload.
- Non-2xx responses throw `ApiError`, which carries `status`, `code`, and optional `details`.
- A body that is empty or malformed is treated as a missing envelope rather than a parse crash, so the client fails with a predictable error instead of an unhandled `SyntaxError`.
- A `2xx` response that lacks a `data` envelope throws `ApiError` with code `INVALID_RESPONSE`.

## Conventions for new endpoints

1. Validate and coerce all input with Zod before it reaches business logic. Return `422` with `error.details` for field problems.
2. Enforce authorization on the server. The frontend hiding a control is never a substitute for a server-side check.
3. Use `404` for a resource that does not exist and `403` for one the caller may not access but owns differently.
4. Make writes idempotent where the domain allows it, and return `409` for genuine conflicts.
5. Keep responses limited to the fields the client needs. Never return password hashes, tokens, or internal identifiers that have no consumer.
6. Log every error server-side with the request id and return that id to the client only through the server log, not the response body.
