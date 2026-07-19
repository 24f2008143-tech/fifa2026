import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * NEVER import this file from any client component — it bypasses RLS.
 * Use only inside API routes (app/api/**\/route.ts) or server actions,
 * e.g. the simulator cron job and the AI dispatch route.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dckubpyvchkrbjnlqugm.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!serviceRoleKey) {
    console.warn(
      'Missing SUPABASE_SERVICE_ROLE_KEY. ' +
        'Using public anon key fallback.'
    );
  }

  return createClient(url, serviceRoleKey || 'dummy-key', {
    auth: { persistSession: false },
  });
}
