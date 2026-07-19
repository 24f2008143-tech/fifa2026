import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

/**
 * Vercel Cron target — replaces the "standalone Node.js script" version of
 * the live data simulator, since Vercel serverless functions can't run a
 * long-lived background process. Vercel Cron hits this route on a schedule
 * (see vercel.json) instead.
 *
 * Configure the schedule in vercel.json. Vercel's free/hobby cron minimum
 * interval is 1x/day — for a real demo-day cadence (every 1-5 min) you need
 * a Pro plan, or trigger this route from an external scheduler (e.g. a
 * cron-job.org ping) hitting this same URL with the secret header below.
 */

const MAX_STEP = 4; // max density % drift per tick, keeps movement gradual not noisy

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(req: NextRequest) {
  // Protect the endpoint — Vercel Cron sends this header automatically;
  // also allow a manual secret query param for external scheduler pings.
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  const { data: zones, error: zonesError } = await supabase.from('zones').select('*');
  if (zonesError) {
    return NextResponse.json({ error: zonesError.message }, { status: 500 });
  }

  const updates = (zones ?? []).map((zone: any) => {
    const drift = (Math.random() - 0.45) * MAX_STEP; // slight upward bias
    const nextDensity = clamp(Number(zone.density_pct ?? 50) + drift, 5, 100);
    return {
      id: zone.id,
      density_pct: Math.round(nextDensity * 10) / 10,
      updated_at: new Date().toISOString(),
    };
  });

  for (const update of updates) {
    const { error } = await supabase
      .from('zones')
      .update({ density_pct: update.density_pct, updated_at: update.updated_at })
      .eq('id', update.id);
    if (error) console.error(`[simulate] failed to update zone ${update.id}:`, error.message);
  }

  // Log a crowd_snapshots row for history/trend sparklines
  const avgDensity =
    updates.reduce((sum, u) => sum + u.density_pct, 0) / (updates.length || 1);
  await supabase.from('crowd_snapshots').insert({
    avg_density_pct: Math.round(avgDensity * 10) / 10,
    recorded_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, zonesUpdated: updates.length, avgDensity });
}
