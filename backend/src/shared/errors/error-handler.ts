import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';
import type { AppLogger } from '../logger/logger.js';
import { sendError } from '../utils/response.js';

/**
 * Centralized error handling.
 *
 * Expected errors (`AppError`, Zod validation failures) are converted into the
 * documented error envelope. Unexpected errors are logged with their stack and
 * reported to the client as a generic 500 so internal details never leak.
 */
export function createErrorHandler(logger: AppLogger): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof AppError) {
      logger.warn(
        { err: error, code: error.code, status: error.status },
        'Request failed with an application error',
      );
      sendError(res, error.status, {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      });
      return;
    }

    if (error instanceof ZodError) {
      logger.warn({ err: error }, 'Request failed validation');
      sendError(res, 422, {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
      return;
    }

    logger.error({ err: error }, 'Unhandled error while processing request');
    sendError(res, 500, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  };
}

/**
 * Catch-all 404 handler for unmatched routes.
 */
export function createNotFoundHandler(): RequestHandler {
  return (req, res) => {
    sendError(res, 404, {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  };
}
