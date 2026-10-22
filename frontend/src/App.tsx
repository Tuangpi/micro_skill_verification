import { useEffect, useState } from 'react';

import { ApiError, fetchHealth } from './api/client.ts';
import type { HealthStatus } from './api/types.ts';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; status: HealthStatus }
  | { kind: 'error'; message: string };

/**
 * Root application shell.
 *
 * Renders the API health status so the full stack can be verified end to end
 * from the browser.
 */
export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;

    fetchHealth()
      .then((status) => {
        if (active) {
          setHealth({ kind: 'ready', status });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setHealth({
            kind: 'error',
            message:
              error instanceof ApiError
                ? error.message
                : 'Unable to reach the API server',
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Micro Skill</h1>
        <p className="text-slate-600">
          Full-stack workspace foundation with a typed API boundary.
        </p>
      </header>

      <section
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-medium">API status</h2>
        <HealthPanel state={health} />
      </section>
    </main>
  );
}

/** Renders the different health states. */
function HealthPanel({ state }: { state: HealthState }) {
  if (state.kind === 'loading') {
    return <p className="text-slate-500">Checking API status…</p>;
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-medium text-red-700">API unreachable</p>
        <p className="text-sm text-slate-600">{state.message}</p>
      </div>
    );
  }

  const { status } = state;
  const databaseUp = status.checks.database.status === 'up';

  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <div>
        <dt className="text-sm text-slate-500">Status</dt>
        <dd
          className={`font-medium ${status.status === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}
        >
          {status.status}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-slate-500">Database</dt>
        <dd className={`font-medium ${databaseUp ? 'text-emerald-700' : 'text-red-700'}`}>
          {status.checks.database.status}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-slate-500">Latency</dt>
        <dd className="font-medium">{status.checks.database.latencyMs} ms</dd>
      </div>
    </dl>
  );
}
