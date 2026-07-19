import { Venue, Gate, Zone, Match, Incident, HelpRequest, Broadcast } from "../types";

export interface LiveStateResponse {
  gates: Gate[];
  zones: Zone[];
  matches: Match[];
  incidents: Incident[];
  helpRequests: HelpRequest[];
  broadcasts: Broadcast[];
  sustainability?: any[];
}

/**
 * Fetches all available stadium venues.
 */
export async function fetchVenues(): Promise<Venue[]> {
  const res = await fetch("/api/db/venues");
  if (!res.ok) {
    throw new Error(`Failed to fetch venues: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetches full live operational state for a specific venue.
 */
export async function fetchVenueState(venueId: string): Promise<LiveStateResponse> {
  const res = await fetch(`/api/db/state?venueId=${venueId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch state for venue ${venueId}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Resets and re-seeds the in-memory database.
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/db/init", { method: "POST" });
  if (!res.ok) {
    throw new Error(`Database initialization failed: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Adds an active operational incident.
 */
export async function addIncident(payload: {
  venueId: string;
  zoneId: string;
  type: string;
  severity: string;
  description: string;
  reportedBy: string;
}): Promise<{ success: boolean; incident: Incident }> {
  const res = await fetch("/api/db/add-incident", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to add incident: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Resolves an active incident.
 */
export async function resolveIncident(payload: {
  incId: string;
  status: "resolved";
}): Promise<{ success: boolean; incident: Incident }> {
  const res = await fetch("/api/db/resolve-incident", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve incident: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Submits a new assistance request (Fan App).
 */
export async function requestAssistance(payload: {
  userId: string;
  venueId: string;
  zoneId: string;
  category: string;
  description: string;
  urgency: string;
}): Promise<{ success: boolean; request: HelpRequest }> {
  const res = await fetch("/api/db/request-assistance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to request assistance: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Assigns an assistance request to a volunteer.
 */
export async function assignHelpTask(payload: {
  reqId: string;
  volunteerId: string;
}): Promise<{ success: boolean; request: HelpRequest }> {
  const res = await fetch("/api/db/assign-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to assign help task: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Resolves an assigned help request.
 */
export async function resolveHelpTask(payload: {
  reqId: string;
}): Promise<{ success: boolean; request: HelpRequest }> {
  const res = await fetch("/api/db/resolve-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve help task: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Saves a translation as an official broadcast announcement.
 */
export async function addBroadcast(payload: {
  venueId: string;
  original: string;
  translations: any;
  severity: string;
}): Promise<{ success: boolean; broadcast: Broadcast }> {
  const res = await fetch("/api/db/add-broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to publish broadcast: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Logs a sustainability public transport trip.
 */
export async function logTrip(payload: {
  venueId: string;
  userId: string;
  tripMode: string;
  distanceKm: number;
}): Promise<{ success: boolean; log: any }> {
  const res = await fetch("/api/db/log-trip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to log sustainable trip: ${res.statusText}`);
  }
  return res.json();
}
