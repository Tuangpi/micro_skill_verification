import { useState } from 'react';

import {
  fetchSession,
  loginUser,
  logoutUser,
  registerUser,
  type RegisterInput,
} from '../api/client.ts';
import type { AuthUser } from '../api/types.ts';

/** Minimal authentication flow for manual verification. */
export function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'register') {
        const input: RegisterInput = { email, name, password };
        const created = await registerUser(input);
        setUser(created);
        setMessage(`Registered ${created.email}`);
      } else {
        const logged = await loginUser({ email, password });
        setUser(logged);
        setMessage(`Logged in as ${logged.email}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setMessage(null);
    try {
      await logoutUser();
      setUser(null);
      setMessage('Logged out');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSession() {
    setBusy(true);
    setMessage(null);
    try {
      const current = await fetchSession();
      setUser(current);
      setMessage(`Session: ${current.email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium">Authentication</h2>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded px-3 py-1 text-sm ${mode === 'login' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`rounded px-3 py-1 text-sm ${mode === 'register' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
        >
          Register
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
          required
        />
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
            required
          />
        )}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSession}
          disabled={busy}
          className="rounded bg-slate-100 px-3 py-1 text-sm"
        >
          Check session
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="rounded bg-slate-100 px-3 py-1 text-sm"
        >
          Logout
        </button>
      </div>
      {user && (
        <p className="mt-3 text-sm text-slate-700">
          Signed in as {user.email} ({user.role})
        </p>
      )}
      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
