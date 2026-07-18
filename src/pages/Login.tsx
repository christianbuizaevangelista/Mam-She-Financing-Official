import { useState } from 'react';
import { Lock, LogIn, ShieldCheck, AlertCircle, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { supabase, OWNER_EMAIL } from '../lib/supabase';
import { Logo } from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function signIn(withEmail: string, withPassword: string) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: withEmail.trim(), password: withPassword });
    setBusy(false);
    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        setError('Wrong email or password. First time or forgot it? Tap “Set up / reset password”.');
        return;
      }
      setError(error.message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!supabase) {
      setError('Authentication is not configured.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    await signIn(email, password);
  }

  async function sendReset() {
    setError(null);
    setInfo(null);
    if (!supabase) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your email above first.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo(`We sent a password setup link to ${email.trim()}. Check your inbox (and spam) to set your password.`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-14 w-14 shadow-card rounded-full" />
          <h1 className="mt-3 text-xl font-bold text-ink">StockUp PH</h1>
          <p className="text-sm text-slate-500">Sign in to your account</p>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-slate-800">Log in</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-500">Sign in to access the dashboard.</p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input !pl-9" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label !mb-0">Password</label>
                <button type="button" onClick={sendReset} disabled={busy} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Set up / reset password
                </button>
              </div>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input !pl-9" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{info}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Log in
            </button>
          </form>

        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Owner: {OWNER_EMAIL}
        </div>
      </div>
    </div>
  );
}
