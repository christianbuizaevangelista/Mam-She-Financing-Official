import { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

/** Shown when the user arrives from a password setup/recovery email link. */
export default function SetPassword({ email, onDone }: { email?: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(onDone, 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-14 w-14 shadow-card rounded-full" />
          <h1 className="mt-3 text-xl font-bold text-ink">StockUp PH</h1>
          <p className="text-sm text-slate-500">Set up your password</p>
        </div>

        <div className="card p-6">
          {done ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-slate-800">Password set!</p>
              <p className="text-sm text-slate-500">Taking you to the dashboard…</p>
            </div>
          ) : (
            <>
              {email && (
                <div className="mb-5 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
              <h2 className="font-bold text-slate-800">Choose a password</h2>
              <p className="mb-4 mt-0.5 text-sm text-slate-500">Create the password you'll use to sign in.</p>

              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="label">New password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input !pl-9" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                  </div>
                </div>
                <div>
                  <label className="label">Confirm password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input !pl-9" type="password" autoComplete="new-password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Save password &amp; continue
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
