import type {
  ApiErrorPayload,
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthUser,
  HealthStatus,
} from './types.ts';

/** Base path for every backend call. */
export const API_BASE_URL = '/api/v1';

/** Error thrown when the backend returns a non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

/**
 * Performs a request against the backend and unwraps the response envelope.
 *
 * @throws {ApiError} when the backend replies with a non-2xx status.
 */
export async function request<TData>(path: string, init?: RequestInit): Promise<TData> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  const payload = await parseBody(response);

  if (!response.ok) {
    const error = isErrorResponse(payload) ? payload.error : null;
    throw new ApiError(
      response.status,
      error ?? { code: 'UNKNOWN_ERROR', message: 'Unexpected API error' },
    );
  }

  if (!isSuccessResponse<TData>(payload)) {
    throw new ApiError(response.status, {
      code: 'INVALID_RESPONSE',
      message: 'The API response did not include a data envelope',
    });
  }

  return payload.data;
}

/** Parses a JSON body, tolerating empty or malformed payloads. */
async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Narrows an unknown payload to the success envelope. */
function isSuccessResponse<TData>(
  payload: unknown,
): payload is ApiSuccessResponse<TData> {
  return typeof payload === 'object' && payload !== null && 'data' in payload;
}

/** Narrows an unknown payload to the error envelope. */
function isErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof (payload as ApiErrorResponse).error === 'object' &&
    (payload as ApiErrorResponse).error !== null
  );
}

/** Fetches the API and database health status. */

/** Fetches (and sets) a CSRF token cookie, returning the token. */
export async function fetchCsrfToken(): Promise<string> {
  const data = await request<{ csrfToken: string }>('/auth/csrf-token', {
    method: 'GET',
  });
  return data.csrfToken;
}

export type RegisterInput = { email: string; name: string; password: string };
export type LoginInput = { email: string; password: string };

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': await fetchCsrfToken(),
    },
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  const csrfToken = await fetchCsrfToken();
  const data = await request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function logoutUser(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await request<unknown>('/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export async function fetchSession(): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>('/auth/session');
  return data.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await request<unknown>('/auth/password-reset-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await request<unknown>('/auth/password-resets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ token, password }),
  });
}
export function fetchHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health');
}
