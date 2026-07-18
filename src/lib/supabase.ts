import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The app falls back to localStorage-only mode when these env vars are missing,
 * so it still runs without a Supabase project configured.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      // The inline script in index.html captures recovery/invite tokens from the
      // URL hash and AuthProvider establishes the session via setSession(), so we
      // disable the automatic URL handling here.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

/** The owner account. Only this address can set a password on first run. */
export const OWNER_EMAIL = 'christianbuizaevangelista@gmail.com';
