/**
 * Service layer for all Gemini AI backend interactions.
 */

export interface ConciergeResponse {
  text: string;
}

export interface CopilotResponse {
  text: string;
}

export interface BroadcastTranslation {
  pa: string;
  push: string;
  caption: string;
  simple: string;
}

export interface BroadcastTranslationsResponse {
  en: BroadcastTranslation;
  es: BroadcastTranslation;
  fr: BroadcastTranslation;
}

export interface PostMatchReportResponse {
  markdown: string;
}

/**
 * Sends a message to the multilingual AI Concierge.
 */
export async function fetchConcierge(
  message: string,
  venueId: string,
  currentZoneId?: string,
  preferredLanguage?: string
): Promise<ConciergeResponse> {
  const res = await fetch("/api/gemini/concierge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, venueId, currentZoneId, preferredLanguage }),
  });
  if (!res.ok) {
    throw new Error(`AI Concierge request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Sends a query to the Operational Intelligence Copilot.
 */
export async function fetchCopilot(query: string, venueId: string): Promise<CopilotResponse> {
  const res = await fetch("/api/gemini/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, venueId }),
  });
  if (!res.ok) {
    throw new Error(`AI Copilot request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Translates and optimizes a public broadcast announcement across English, Spanish, and French.
 */
export async function fetchTranslateBroadcast(
  originalMessage: string,
  severity: string,
  venueId: string
): Promise<BroadcastTranslationsResponse> {
  const res = await fetch("/api/gemini/translate-broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originalMessage, severity, venueId }),
  });
  if (!res.ok) {
    throw new Error(`AI Broadcast Translation failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Generates an executive post-match operational report in Markdown format.
 */
export async function fetchPostMatchReport(venueId: string): Promise<PostMatchReportResponse> {
  const res = await fetch("/api/gemini/post-match-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venueId }),
  });
  if (!res.ok) {
    throw new Error(`AI Post-Match Report generation failed with status ${res.status}`);
  }
  return res.json();
}
