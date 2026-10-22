import type { Response } from 'express';

/**
 * Consistent API response shapes.
 *
 * The API documentation does not prescribe a response envelope, so this
 * project standardises on:
 *   success -> { "data": <payload> }
 *   failure -> { "error": { "code": ..., "message": ..., "details"?: ... } }
 *
 * This is documented in docs/API_CONVENTIONS.md and is the contract the
 * frontend client is built against.
 */

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccessBody<T> = {
  data: T;
};

export type ApiFailureBody = {
  error: ApiErrorBody;
};

export function sendData<T>(res: Response, payload: T, statusCode = 200): Response {
  return res.status(statusCode).json({ data: payload } satisfies ApiSuccessBody<T>);
}

export function sendError(
  res: Response,
  statusCode: number,
  body: ApiErrorBody,
): Response {
  return res.status(statusCode).json({ error: body } satisfies ApiFailureBody);
}
