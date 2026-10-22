/**
 * Shared API contract types.
 *
 * These mirror the backend envelope documented in `docs/API_CONVENTIONS.md`:
 * successful responses are `{ data }` and failures are `{ error }`.
 */

/** Envelope returned for a successful request. */
export interface ApiSuccessResponse<TData> {
  data: TData;
}

/** Error payload carried inside a failed response. */
export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

/** Envelope returned for a failed request. */
export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

/** Either envelope, as received over the wire. */
export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

/** Health check payload exposed by `GET /api/v1/health`. */
export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
    };
  };
}
