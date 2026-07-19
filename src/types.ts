export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
}

export interface Gate {
  id: string;
  venueId: string;
  name: string;
  type: "standard" | "accessible";
  currentOccupancy: number;
  capacity: number;
}

export interface Zone {
  id: string;
  venueId: string;
  name: string;
  currentDensityPct: number;
  history: number[];
}

export interface Match {
  id: string;
  venueId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: "upcoming" | "live" | "completed";
  scoreHome?: number;
  scoreAway?: number;
  minute?: number;
  possessionHome?: number;
}

export interface Incident {
  id: string;
  venueId: string;
  zoneId: string;
  type: "crowd_warning" | "medical" | "accessibility" | "security" | "other";
  severity: "low" | "medium" | "high" | "emergency";
  status: "active" | "resolved";
  description: string;
  reportedBy: string;
  createdAt: string;
}

export interface HelpRequest {
  id: string;
  userId: string;
  venueId: string;
  zoneId: string;
  category: "accessibility" | "medical" | "lost" | "general";
  status: "unassigned" | "assigned" | "resolved";
  assignedVolunteerId?: string;
  description: string;
  urgency: "low" | "medium" | "high" | "emergency";
  createdAt: string;
}

export interface SustainabilityLog {
  id: string;
  userId: string;
  venueId: string;
  tripMode: "transit" | "walk" | "rideshare" | "drive";
  distanceKm: number;
  co2SavedKg: number;
  createdAt: string;
}

export interface Broadcast {
  id: string;
  venueId: string;
  severity: "info" | "advisory" | "urgent";
  timestamp: string;
  original: string;
  translations: {
    [lang: string]: {
      pa: string;
      push: string;
      caption: string;
      simple: string;
    };
  };
}
