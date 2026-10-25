import { z } from 'zod';

/**
 * Server environment validation.
 *
 * Required configuration is validated during startup so the process fails fast
 * with an actionable message instead of surfacing confusing errors later.
 */

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  ALLOWED_ORIGINS: z.string().default(''),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  STORAGE_ROOT: z.string().min(1).default('./var/storage'),
  TRUST_PROXY: booleanish.default(false),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(10080).default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(8760).default(168),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  allowedOrigins: string[];
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  databaseUrl: string;
  storageRoot: string;
  trustProxy: boolean;
  sessionSecret: string;
  sessionIdleMinutes: number;
  sessionAbsoluteHours: number;
  authRateLimitWindowMinutes: number;
  authRateLimitMax: number;
  isProduction: boolean;
};

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    allowedOrigins: env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    storageRoot: env.STORAGE_ROOT,
    trustProxy: env.TRUST_PROXY,
    sessionSecret: env.SESSION_SECRET,
    sessionIdleMinutes: env.SESSION_IDLE_MINUTES,
    sessionAbsoluteHours: env.SESSION_ABSOLUTE_HOURS,
    authRateLimitWindowMinutes: env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
    authRateLimitMax: env.AUTH_RATE_LIMIT_MAX,
    isProduction: env.NODE_ENV === 'production',
  };
}
