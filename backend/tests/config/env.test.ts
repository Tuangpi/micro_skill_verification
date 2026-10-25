import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  const baseEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    SESSION_SECRET: 'test-session-secret-that-is-at-least-32-characters-long',
  } as NodeJS.ProcessEnv;

  it('parses a minimal valid environment', () => {
    const config = loadConfig(baseEnv);

    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(4000);
    expect(config.apiPrefix).toBe('/api/v1');
    expect(config.databaseUrl).toBe('postgresql://user:pass@localhost:5432/db');
    expect(config.isProduction).toBe(false);
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'staging' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => loadConfig({ ...baseEnv, PORT: 'not-a-port' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('splits ALLOWED_ORIGINS into a trimmed list', () => {
    const config = loadConfig({
      ...baseEnv,
      ALLOWED_ORIGINS: 'http://localhost:5173, https://example.test ,',
    });

    expect(config.allowedOrigins).toEqual([
      'http://localhost:5173',
      'https://example.test',
    ]);
  });

  it('flags production mode', () => {
    const config = loadConfig({ ...baseEnv, NODE_ENV: 'production' });

    expect(config.isProduction).toBe(true);
  });

  it('parses TRUST_PROXY as a boolean', () => {
    expect(loadConfig({ ...baseEnv, TRUST_PROXY: 'true' }).trustProxy).toBe(true);
    expect(loadConfig({ ...baseEnv, TRUST_PROXY: '0' }).trustProxy).toBe(false);
  });
});
