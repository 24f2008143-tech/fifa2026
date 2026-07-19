import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * NEVER import this file from any client component — it bypasses RLS.
 * Use only inside API routes (app/api/**\/route.ts) or server actions,
 * e.g. the simulator cron job and the AI dispatch route.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set these as server-only environment variables in Vercel (do NOT prefix with NEXT_PUBLIC_).'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
