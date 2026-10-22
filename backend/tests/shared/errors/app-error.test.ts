import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../src/shared/errors/app-error.js';

describe('AppError', () => {
  it('maps error codes to HTTP status codes', () => {
    expect(new AppError('BAD_REQUEST', 'bad').status).toBe(400);
    expect(new AppError('VALIDATION_ERROR', 'invalid').status).toBe(422);
    expect(new AppError('UNAUTHORIZED', 'no auth').status).toBe(401);
    expect(new AppError('FORBIDDEN', 'no perms').status).toBe(403);
    expect(new AppError('NOT_FOUND', 'missing').status).toBe(404);
    expect(new AppError('CONFLICT', 'clash').status).toBe(409);
    expect(new AppError('RATE_LIMITED', 'slow down').status).toBe(429);
    expect(new AppError('INTERNAL_ERROR', 'boom').status).toBe(500);
  });

  it('exposes client errors but hides server errors', () => {
    expect(new AppError('NOT_FOUND', 'missing').expose).toBe(true);
    expect(new AppError('INTERNAL_ERROR', 'boom').expose).toBe(false);
  });

  it('provides typed subclasses', () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new UnauthorizedError().code).toBe('UNAUTHORIZED');
    expect(new ForbiddenError().code).toBe('FORBIDDEN');
    expect(new ValidationError().code).toBe('VALIDATION_ERROR');
    expect(new ConflictError().code).toBe('CONFLICT');
  });

  it('keeps details for structured client feedback', () => {
    const error = new ValidationError('invalid body', { field: 'email' });

    expect(error.details).toEqual({ field: 'email' });
  });
});
