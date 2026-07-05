import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { setAccount } from './account';
import Login from '../pages/Login';
import SetPassword from '../pages/SetPassword';

interface AuthValue {
  session: Session | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({ session: null, signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Arriving from a password setup/recovery email link.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (s?.user?.email) setAccount({ email: s.user.email, emailVerified: true });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Without Supabase (e.g. local dev with no env) the app runs unauthenticated.
  if (!isSupabaseConfigured) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    );
  }

  if (recovery) {
    return <SetPassword email={session?.user?.email} onDone={() => setRecovery(false)} />;
  }

  if (!session) return <Login />;

  const signOut = async () => {
    try {
      await supabase?.auth.signOut();
    } catch {
      /* ignore */
    }
  };

  return <AuthContext.Provider value={{ session, signOut }}>{children}</AuthContext.Provider>;
}
