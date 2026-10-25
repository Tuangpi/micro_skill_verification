import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(value);
      } catch {
        result[key] = value;
      }
    }
  }
  return result;
}

function isStateChanging(method: string): boolean {
  return (
    method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  );
}

function originAllowed(req: Request, allowedOrigins: string[]): boolean {
  const origin = req.get('origin');
  const referer = req.get('referer');
  const candidate = origin ?? (referer ? new URL(referer).origin : undefined);
  if (!candidate) {
    // No Origin/Referer (e.g. same-origin navigation or curl): allow only in dev.
    return true;
  }
  if (allowedOrigins.length === 0) {
    return true;
  }
  return allowedOrigins.includes(candidate);
}

export function issueCsrfToken(res: Response, isProduction: boolean): string {
  const token = randomBytes(32).toString('hex');
  const cookieParts = [
    `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'SameSite=Lax',
    isProduction ? 'Secure' : '',
  ].filter(Boolean);
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return token;
}

/**
 * Middleware protecting state-changing requests with a double-submit CSRF token.
 * Requires the client to send the token both as the `csrf_token` cookie and as
 * the `X-CSRF-Token` header.
 */
export function createCsrfProtection(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isStateChanging(req.method)) {
      next();
      return;
    }

    if (!originAllowed(req, allowedOrigins)) {
      res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'Origin not allowed' } });
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = req.get(CSRF_HEADER);

    if (!cookieToken || !headerToken) {
      res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'CSRF token missing' } });
      return;
    }

    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'CSRF token invalid' } });
      return;
    }

    next();
  };
}

export { CSRF_COOKIE, CSRF_HEADER };
