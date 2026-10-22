import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { App } from '../src/App.tsx';

const originalFetch = globalThis.fetch;

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('App', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders the loading state before the request resolves', () => {
    globalThis.fetch = vi.fn<typeof fetch>().mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByText('Checking API status…')).toBeInTheDocument();
  });

  it('renders the health status returned by the API', async () => {
    mockFetch({
      data: {
        status: 'ok',
        uptimeSeconds: 42,
        timestamp: '2026-01-01T00:00:00.000Z',
        checks: { database: { status: 'up', latencyMs: 3.5 } },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument();
    });
    expect(screen.getByText('up')).toBeInTheDocument();
    expect(screen.getByText('3.5 ms')).toBeInTheDocument();
  });

  it('renders an unreachable message when the API call fails', async () => {
    mockFetch({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Service down' } }, 503);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('API unreachable')).toBeInTheDocument();
    });
    expect(screen.getByText('Service down')).toBeInTheDocument();
  });
});
