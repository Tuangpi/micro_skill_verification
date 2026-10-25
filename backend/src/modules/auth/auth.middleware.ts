import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error.js';

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isActive: boolean;
};

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    absoluteExpiresAt?: number;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    next(new UnauthorizedError());
    return;
  }
  next();
}

export function requireRole(...roles: Array<'STUDENT' | 'TEACHER' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as Request & { currentUser?: AuthedUser }).currentUser;
    if (!user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

export function attachCurrentUser(loader: (id: string) => Promise<AuthedUser | null>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const userId = req.session?.userId;
    if (!userId) {
      next();
      return;
    }
    try {
      const user = await loader(userId);
      if (!user || !user.isActive) {
        req.session.destroy(() => undefined);
        next(new UnauthorizedError());
        return;
      }
      // absolute expiry check
      const now = Date.now();
      if (req.session.absoluteExpiresAt && now > req.session.absoluteExpiresAt) {
        req.session.destroy(() => undefined);
        next(new UnauthorizedError('Session expired'));
        return;
      }
      (req as Request & { currentUser?: AuthedUser }).currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
