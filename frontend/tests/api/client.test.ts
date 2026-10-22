import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ApiError, API_BASE_URL, fetchHealth, request } from '../../src/api/client.ts';

const originalFetch = globalThis.fetch;

function mockFetch(response: Response) {
  const spy = vi.fn<typeof fetch>().mockResolvedValue(response);
  globalThis.fetch = spy;
  return spy;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('requests the configured base url and unwraps the data envelope', async () => {
    const spy = mockFetch(jsonResponse({ data: { status: 'ok' } }));

    const result = await request<{ status: string }>('/health');

    expect(result).toEqual({ status: 'ok' });
    expect(spy).toHaveBeenCalledWith(`${API_BASE_URL}/health`, expect.any(Object));
  });

  it('throws an ApiError carrying the server error payload', async () => {
    mockFetch(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404),
    );

    const error = await request('/missing').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Route not found',
    });
  });

  it('falls back to a generic error when the body has no error envelope', async () => {
    mockFetch(new Response('', { status: 500 }));

    const error = await request('/boom').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, code: 'UNKNOWN_ERROR' });
  });

  it('fetches the health status from the health endpoint', async () => {
    const spy = mockFetch(
      jsonResponse({
        data: {
          status: 'ok',
          uptimeSeconds: 12.5,
          timestamp: '2026-01-01T00:00:00.000Z',
          checks: { database: { status: 'up', latencyMs: 4.2 } },
        },
      }),
    );

    const health = await fetchHealth();

    expect(health.checks.database.status).toBe('up');
    expect(spy).toHaveBeenCalledWith(`${API_BASE_URL}/health`, expect.any(Object));
  });
});
