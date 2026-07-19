import { supabase } from "../lib/supabase";

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

/**
 * Subscribes to real-time changes in the 'zones' table.
 */
export function subscribeToZones(onUpdate: (payload: any) => void) {
  const channel = supabase
    .channel("public:zones")
    .on("postgres_changes", { event: "*", schema: "public", table: "zones" }, onUpdate)
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribes to real-time changes in the 'incidents' table.
 */
export function subscribeToIncidents(onUpdate: (payload: any) => void) {
  const channel = supabase
    .channel("public:incidents")
    .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, onUpdate)
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribes to real-time changes in the 'help_requests' table.
 */
export function subscribeToHelpRequests(onUpdate: (payload: any) => void) {
  const channel = supabase
    .channel("public:help_requests")
    .on("postgres_changes", { event: "*", schema: "public", table: "help_requests" }, onUpdate)
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Subscribes to insert events in the 'crowd_snapshots' table.
 */
export function subscribeToCrowdSnapshots(onUpdate: (payload: any) => void) {
  const channel = supabase
    .channel("public:crowd_snapshots")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "crowd_snapshots" }, onUpdate)
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
