import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (anon key only — safe to expose).
 * Used for Realtime subscriptions and any read the anon/RLS-scoped
 * role is allowed to make directly from the client.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set these in your Vercel project environment variables and .env.local.'
    );
  }

  browserClient = createClient(url, anonKey, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  return browserClient;
}
