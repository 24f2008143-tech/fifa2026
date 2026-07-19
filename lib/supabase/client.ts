import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (anon key only — safe to expose).
 * Used for Realtime subscriptions and any read the anon/RLS-scoped
 * role is allowed to make directly from the client.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || (import.meta.env && import.meta.env.VITE_SUPABASE_URL);
  const anonKey = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY or VITE_SUPABASE_URL/ANON_KEY in your env.'
    );
  }

  browserClient = createClient(url, anonKey, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  return browserClient;
}
