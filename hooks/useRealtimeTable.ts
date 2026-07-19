'use client';

import { useEffect, useState, useRef } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type ConnectionStatus = 'connecting' | 'online' | 'offline' | 'error';

interface UseRealtimeTableOptions<T> {
  table: string;
  /** Optional filter, e.g. `venue_id=eq.metlife-01` */
  filter?: string;
  /** Initial rows to show before the first fetch/realtime event lands */
  initialData?: T[];
  /** Primary key field used to upsert/replace rows on UPDATE, default 'id' */
  primaryKey?: string;
}

/**
 * Generic realtime subscription hook — use this for ANY table that needs
 * to feel "live": zones, crowd_snapshots, help_requests, match_events,
 * player_stats. One hook, reused everywhere, so every feature stays
 * consistent and the connection-status badge is accurate app-wide.
 *
 * Realtime connects directly from the browser to Supabase over a
 * websocket — it does NOT go through any Vercel serverless function.
 * Vercel hosts the static/SSR app; Supabase Realtime handles the live
 * data channel independently. Don't try to proxy this through an API route.
 */
export function useRealtimeTable<T extends Record<string, any>>({
  table,
  filter,
  initialData = [],
  primaryKey = 'id',
}: UseRealtimeTableOptions<T>) {
  const [rows, setRows] = useState<T[]>(initialData);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const rowsRef = useRef<T[]>(initialData);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    async function loadInitial() {
      let query = supabase.from(table).select('*');
      if (filter) {
        const [col, op, val] = filter.split(/=(eq|neq|gt|lt)\./).filter(Boolean);
        // simple eq-only convenience parse; extend if you need gt/lt etc.
        if (col && val) query = query.eq(col, val);
      }
      const { data, error } = await query;
      if (!isMounted) return;
      if (error) {
        console.error(`[useRealtimeTable] initial fetch failed for ${table}:`, error.message);
        setStatus('error');
        return;
      }
      rowsRef.current = (data ?? []) as T[];
      setRows(rowsRef.current);
    }

    loadInitial();

    const channel = supabase
      .channel(`realtime:${table}${filter ? `:${filter}` : ''}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const next = [...rowsRef.current];

          if (payload.eventType === 'INSERT') {
            next.push(payload.new as T);
          } else if (payload.eventType === 'UPDATE') {
            const idx = next.findIndex(
              (r) => r[primaryKey] === (payload.new as T)[primaryKey]
            );
            if (idx >= 0) next[idx] = payload.new as T;
            else next.push(payload.new as T);
          } else if (payload.eventType === 'DELETE') {
            const idx = next.findIndex(
              (r) => r[primaryKey] === (payload.old as T)[primaryKey]
            );
            if (idx >= 0) next.splice(idx, 1);
          }

          rowsRef.current = next;
          setRows(next);
        }
      )
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') setStatus('online');
        else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') setStatus('error');
        else if (subStatus === 'CLOSED') setStatus('offline');
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [table, filter, primaryKey]);

  return { rows, status };
}
