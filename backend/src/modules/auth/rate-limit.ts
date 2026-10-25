import rateLimit from 'express-rate-limit';
import type { AppConfig } from '../../config/env.js';

export function createAuthRateLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.authRateLimitWindowMinutes * 60 * 1000,
    max: config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    },
  });
}
