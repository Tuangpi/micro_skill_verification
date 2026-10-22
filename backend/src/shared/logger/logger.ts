import { pino, type Logger } from 'pino';
import type { AppConfig } from '../../config/env.js';

/**
 * Structured application logger.
 *
 * Logs are emitted as JSON in production and as human-readable text in
 * development. Secrets are never logged; call sites are responsible for
 * excluding sensitive fields.
 */
export function createLogger(config: Pick<AppConfig, 'nodeEnv' | 'logLevel'>): Logger {
  const base = {
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'password',
        'passwordHash',
        'token',
        'resetToken',
      ],
      censor: '[redacted]',
    },
  };

  if (config.nodeEnv === 'production') {
    return pino(base);
  }

  return pino({
    ...base,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
    },
  });
}

export type AppLogger = Logger;
