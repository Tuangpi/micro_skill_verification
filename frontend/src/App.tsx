import { useEffect, useState } from 'react';

import { ApiError, fetchHealth } from './api/client.ts';
import type { HealthStatus } from './api/types.ts';
import { AuthPanel } from './auth/AuthPanel.tsx';
import { LanguageProvider, useLanguage } from './i18n.tsx';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; status: HealthStatus }
  | { kind: 'error'; message: string };

function AppInner() {
  const { language, setLanguage, t } = useLanguage();
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-slate-600">{t('subtitle')}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span>{t('language')}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'my')}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="en">English</option>
            <option value="my">မြန်မာ</option>
          </select>
        </label>
      </header>

      <section
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-medium">{t('apiStatus')}</h2>
        <HealthPanel state={health} t={t} />
      </section>

      <AuthPanel />
    </main>
  );
}

function HealthPanel({
  state,
  t,
}: {
  state: HealthState;
  t: (key: 'checking' | 'unreachable' | 'status' | 'database' | 'latency') => string;
}) {
  if (state.kind === 'loading') {
    return <p className="text-slate-500">{t('checking')}</p>;
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-medium text-red-700">{t('unreachable')}</p>
        <p className="text-sm text-slate-600">{state.message}</p>
      </div>
    );
  }

  const { status } = state;
  const databaseUp = status.checks.database.status === 'up';

  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <div>
        <dt className="text-sm text-slate-500">{t('status')}</dt>
        <dd
          className={`font-medium ${status.status === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}
        >
          {status.status}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-slate-500">{t('database')}</dt>
        <dd className={`font-medium ${databaseUp ? 'text-emerald-700' : 'text-red-700'}`}>
          {status.checks.database.status}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-slate-500">{t('latency')}</dt>
        <dd className="font-medium">{status.checks.database.latencyMs} ms</dd>
      </div>
    </dl>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}
