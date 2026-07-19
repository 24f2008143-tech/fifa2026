import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "./lib/supabase/server";

dotenv.config();

const supabase = getSupabaseServerClient();

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================
// Stateful In-Memory Database
// ==========================================

const REAL_VENUES = [
  { id: "v1", name: "MetLife Stadium", city: "East Rutherford", country: "USA", capacity: 82500 },
  { id: "v2", name: "AT&T Stadium", city: "Arlington", country: "USA", capacity: 80000 },
  { id: "v3", name: "SoFi Stadium", city: "Inglewood", country: "USA", capacity: 70240 },
  { id: "v4", name: "Levi's Stadium", city: "Santa Clara", country: "USA", capacity: 68500 },
  { id: "v5", name: "Lumen Field", city: "Seattle", country: "USA", capacity: 69000 },
  { id: "v6", name: "Arrowhead Stadium", city: "Kansas City", country: "USA", capacity: 76416 },
  { id: "v7", name: "NRG Stadium", city: "Houston", country: "USA", capacity: 72220 },
  { id: "v8", name: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA", capacity: 71000 },
  { id: "v9", name: "Hard Rock Stadium", city: "Miami Gardens", country: "USA", capacity: 64767 },
  { id: "v10", name: "Lincoln Financial Field", city: "Philadelphia", country: "USA", capacity: 69796 },
  { id: "v11", name: "Gillette Stadium", city: "Foxborough", country: "USA", capacity: 65878 },
  { id: "v12", name: "Estadio Azteca", city: "Mexico City", country: "Mexico", capacity: 87523 },
  { id: "v13", name: "Estadio Akron", city: "Guadalajara", country: "Mexico", capacity: 48071 },
  { id: "v14", name: "Estadio BBVA", city: "Monterrey", country: "Mexico", capacity: 53500 },
  { id: "v15", name: "BC Place", city: "Vancouver", country: "Canada", capacity: 54500 },
  { id: "v16", name: "BMO Field", city: "Toronto", country: "Canada", capacity: 30000 },
];

const ZONE_NAMES = ["Zone A (North Gate)", "Zone B (East Concourse)", "Zone C (South Gate)", "Zone D (West Concourse)", "Zone E (Premium Suites)"];
const GATE_NAMES = ["Gate 1 (Accessible Main)", "Gate 2 (General)", "Gate 3 (General)", "Gate 4 (VIP/Accessible East)", "Gate 5 (General North)"];

interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
}

interface Gate {
  id: string;
  venueId: string;
  name: string;
  type: "standard" | "accessible";
  currentOccupancy: number;
  capacity: number;
}

interface Zone {
  id: string;
  venueId: string;
  name: string;
  currentDensityPct: number;
  history: number[];
}

interface Match {
  id: string;
  venueId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: "upcoming" | "live" | "completed";
}

interface Incident {
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

interface HelpRequest {
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

interface SustainabilityLog {
  id: string;
  userId: string;
  venueId: string;
  tripMode: "transit" | "walk" | "rideshare" | "drive";
  distanceKm: number;
  co2SavedKg: number;
  createdAt: string;
}

interface Broadcast {
  id: string;
  venueId: string;
  severity: "info" | "advisory" | "urgent";
  timestamp: string;
  original: string;
  translations: {
    [lang: string]: { pa: string; push: string; caption: string; simple: string };
  };
}

// In-Memory Collections
let dbVenues: Venue[] = [...REAL_VENUES];
let dbGates: Gate[] = [];
let dbZones: Zone[] = [];
let dbMatches: Match[] = [];
let dbIncidents: Incident[] = [];
let dbHelpRequests: HelpRequest[] = [];
let dbSustainabilityLogs: SustainabilityLog[] = [];
let dbBroadcasts: Broadcast[] = [];

const VENUE_POLICIES = [
  { topic: "water bottles", policy: "Fans are permitted to bring one unopened plastic bottle of water up to 20oz (0.5L). Metal, glass, or insulated bottles are strictly prohibited." },
  { topic: "re-entry", policy: "Re-entry is strictly prohibited for security reasons. Once your ticket is scanned and you exit the venue gates, you will not be allowed to enter again." },
  { topic: "bag policy", policy: "Clear bags up to 12\" x 6\" x 12\" are allowed. Non-clear small clutch bags/purses up to 4.5\" x 6.5\" are permitted. Backpacks, coolers, and large duffels are banned." },
  { topic: "accessibility services", policy: "Accessible seating, sensory room access, and wheelchair escorts are available. Assistive devices/wheelchairs enter through any Gate, with Priority Access at Gate B (accessible-dedicated)." },
  { topic: "first-aid point", policy: "First Aid stations are located on every concourse: Main Level (near Section 112) and Upper Level (near Section 324). Medical teams roam the zones continuously." }
];

// Seed Initial Data
function initializeDB() {
  dbGates = [];
  dbZones = [];
  dbMatches = [];
  dbIncidents = [];
  dbHelpRequests = [];
  dbSustainabilityLogs = [];
  dbBroadcasts = [];

  // Seed Gates & Zones per venue
  dbVenues.forEach((v) => {
    // 5 Gates per venue
    GATE_NAMES.forEach((gName, idx) => {
      dbGates.push({
        id: `${v.id}-g-${idx + 1}`,
        venueId: v.id,
        name: gName,
        type: idx === 0 || idx === 3 ? "accessible" : "standard",
        currentOccupancy: Math.floor(Math.random() * 4000) + 1000,
        capacity: 6000,
      });
    });

    // 5 Zones per venue
    ZONE_NAMES.forEach((zName, idx) => {
      // Seed some high-density zones (above 80%) to showcase alert system
      const baseDensity = v.id === "v1" && idx === 2 ? 88 : Math.floor(Math.random() * 45) + 30; // Zone C in MetLife starts high
      dbZones.push({
        id: `${v.id}-z-${idx + 1}`,
        venueId: v.id,
        name: zName,
        currentDensityPct: baseDensity,
        history: Array.from({ length: 15 }, () => Math.max(20, Math.min(100, baseDensity + Math.floor(Math.random() * 11) - 5))),
      });
    });
  });

  // Seed Upcoming matches
  dbMatches = [
    { id: "m1", venueId: "v1", homeTeam: "USA", awayTeam: "Italy", kickoffAt: "2026-07-08T18:00:00", status: "live", scoreHome: 2, scoreAway: 1, minute: 72, possessionHome: 54 },
    { id: "m2", venueId: "v2", homeTeam: "Mexico", awayTeam: "Brazil", kickoffAt: "2026-07-09T20:00:00", status: "upcoming" },
    { id: "m3", venueId: "v3", homeTeam: "Canada", awayTeam: "France", kickoffAt: "2026-07-10T16:00:00", status: "upcoming" },
  ];

  // Seed initial Incident
  dbIncidents = [
    {
      id: "inc-1",
      venueId: "v1",
      zoneId: "v1-z-3", // Zone C
      type: "crowd_warning",
      severity: "high",
      status: "active",
      description: "Crowd density in Zone C (South Gate) exceeded 85%. Turning lanes under Gate 3 flow restrictions.",
      reportedBy: "Sensor Feed",
      createdAt: new Date().toISOString(),
    },
  ];

  // Seed initial Help Requests
  dbHelpRequests = [
    {
      id: "req-1",
      userId: "fan-101",
      venueId: "v1",
      zoneId: "v1-z-1",
      category: "accessibility",
      status: "unassigned",
      description: "Need elevator escort near Zone A for an elderly fan.",
      urgency: "medium",
      createdAt: new Date(Date.now() - 500000).toISOString(),
    },
    {
      id: "req-2",
      userId: "fan-102",
      venueId: "v1",
      zoneId: "v1-z-3",
      category: "medical",
      status: "assigned",
      assignedVolunteerId: "vol-7",
      description: "Mild heat exhaustion reported; seated near upper tier Section 112.",
      urgency: "high",
      createdAt: new Date(Date.now() - 200000).toISOString(),
    },
  ];

  // Seed Sustainability Logs
  dbSustainabilityLogs = [
    { id: "sust-1", userId: "fan-201", venueId: "v1", tripMode: "transit", distanceKm: 18, co2SavedKg: 3.2, createdAt: new Date().toISOString() },
    { id: "sust-2", userId: "fan-202", venueId: "v1", tripMode: "walk", distanceKm: 2, co2SavedKg: 0.5, createdAt: new Date().toISOString() },
  ];

  // Seed Broadcasts
  dbBroadcasts = [
    {
      id: "bc-1",
      venueId: "v1",
      severity: "advisory",
      timestamp: new Date().toISOString(),
      original: "Zone C South Gate density is high, we advise arriving fans to utilize Gate D or East Gate.",
      translations: {
        en: {
          pa: "Attention all fans: Zone C South Gate is currently experiencing high crowd densities. To ensure a smooth entry, we advise arriving fans to utilize Gate D or the East Gate.",
          push: "Zone C density is high. Advisory: please use Gate D or the East entrance for quicker access.",
          caption: "[PA Announcement] Zone C density is high. Please utilize Gate D or East Gate.",
          simple: "Zone C is very crowded. Please walk to Gate D or East Gate for a faster entry."
        },
        es: {
          pa: "Atención aficionados: La Zona C de la Puerta Sur registra alta densidad. Se recomienda utilizar la Puerta D o la Puerta Este.",
          push: "Zona C congestionada. Aviso: use la Puerta D o Entrada Este.",
          caption: "[Anuncio PA] Zona C congestionada. Por favor use Puerta D o Puerta Este.",
          simple: "La Zona C está muy llena. Por favor vaya a la Puerta D o Puerta Este."
        },
        fr: {
          pa: "Attention supporters: Zone C Porte Sud est très dense. Nous vous conseillons d'utiliser la Porte D ou la Porte Est.",
          push: "Zone C très occupée. Conseil: utilisez la Porte D ou la Porte Est.",
          caption: "[Annonce PA] Zone C encombrée. Veuillez utiliser la Porte D ou la Porte Est.",
          simple: "La zone C est très occupée. Veuillez aller à la Porte D ou Porte Est."
        }
      }
    }
  ];
}

initializeDB();

// ==========================================
// Sensor Drift & Real-Time simulation background task
// ==========================================
setInterval(async () => {
  if (supabase) {
    try {
      // Phase 6: Live Data Simulator via Supabase
      const { data: zones } = await supabase.from('zones').select('*');
      if (zones && zones.length > 0) {
        for (const z of zones) {
          const drift = Math.floor(Math.random() * 9) - 4; // +/- 4% drift
          const newDensity = Math.max(10, Math.min(98, z.current_density_pct + drift));
          const newHistory = [...z.history, newDensity].slice(-15);

          // Update zone density
          await supabase.from('zones').update({ current_density_pct: newDensity, history: newHistory }).eq('id', z.id);
          
          // Insert snapshot
          await supabase.from('crowd_snapshots').insert({ venue_id: z.venue_id, zone_id: z.id, density_pct: newDensity });

          // Auto-alert if density hits 85%
          if (newDensity >= 85) {
            const { data: existingIncidents } = await supabase
              .from('incidents')
              .select('*')
              .eq('zone_id', z.id)
              .eq('status', 'active')
              .eq('type', 'crowd_warning');

            if (!existingIncidents || existingIncidents.length === 0) {
              await supabase.from('incidents').insert({
                venue_id: z.venue_id,
                zone_id: z.id,
                type: 'crowd_warning',
                severity: 'high',
                status: 'active',
                description: `Automatic Alert: Density in ${z.name} reached ${newDensity}%. Immediate redirection required.`,
                reported_by: 'Crowd Flow Sensor'
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Simulation drift error (Supabase):", err);
    }
  } else {
    // Local fallback
    dbZones.forEach((z) => {
      const drift = Math.floor(Math.random() * 5) - 2;
      z.currentDensityPct = Math.max(10, Math.min(98, z.currentDensityPct + drift));
      z.history.push(z.currentDensityPct);
      if (z.history.length > 15) z.history.shift();

      if (z.currentDensityPct >= 85) {
        const hasAlert = dbIncidents.some((i) => i.zoneId === z.id && i.status === "active" && i.type === "crowd_warning");
        if (!hasAlert) {
          dbIncidents.unshift({
            id: `inc-${Date.now()}`,
            venueId: z.venueId,
            zoneId: z.id,
            type: "crowd_warning",
            severity: "high",
            status: "active",
            description: `Automatic Alert: Density in ${z.name} reached ${z.currentDensityPct}%. Immediate redirection required.`,
            reportedBy: "Crowd Flow Sensor",
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    dbGates.forEach((g) => {
      const drift = Math.floor(Math.random() * 101) - 50;
      g.currentOccupancy = Math.max(100, Math.min(g.capacity, g.currentOccupancy + drift));
    });

    dbMatches.forEach((m) => {
      if (m.status === "live" && m.minute !== undefined) {
        m.minute += 1;
        if (m.minute > 90) m.minute = 90;
        if (m.possessionHome !== undefined) {
          const pDrift = Math.floor(Math.random() * 7) - 3;
          m.possessionHome = Math.max(20, Math.min(80, m.possessionHome + pDrift));
        }
      }
    });
  }
}, 30000); // simulation runs every 30 seconds

// ==========================================
// Database CRUD REST Endpoints
// ==========================================

app.get("/api/db/venues", (req, res) => res.json(dbVenues));
app.get("/api/db/state", (req, res) => {
  const venueId = (req.query.venueId as string) || "v1";
  res.json({
    gates: dbGates.filter((g) => g.venueId === venueId),
    zones: dbZones.filter((z) => z.venueId === venueId),
    matches: dbMatches.filter((m) => m.venueId === venueId),
    incidents: dbIncidents.filter((i) => i.venueId === venueId),
    helpRequests: dbHelpRequests.filter((h) => h.venueId === venueId),
    sustainability: dbSustainabilityLogs.filter((s) => s.venueId === venueId),
    broadcasts: dbBroadcasts.filter((b) => b.venueId === venueId),
  });
});

app.post("/api/db/init", (req, res) => {
  initializeDB();
  res.json({ success: true, message: "Database seeded successfully" });
});

app.post("/api/db/request-assistance", (req, res) => {
  const { category, venueId, zoneId, description, userId } = req.body;
  const newReq: HelpRequest = {
    id: `req-${Date.now()}`,
    userId: userId || "fan-gen",
    venueId: venueId || "v1",
    zoneId: zoneId || "v1-z-1",
    category: category || "general",
    status: "unassigned",
    description: description || "No comment provided.",
    urgency: category === "medical" ? "high" : "medium",
    createdAt: new Date().toISOString(),
  };
  dbHelpRequests.unshift(newReq);
  res.json({ success: true, request: newReq });
});

app.post("/api/db/assign-task", (req, res) => {
  const { reqId, volunteerId } = req.body;
  const item = dbHelpRequests.find((r) => r.id === reqId);
  if (item) {
    item.status = "assigned";
    item.assignedVolunteerId = volunteerId;
    res.json({ success: true, request: item });
  } else {
    res.status(404).json({ error: "Help request not found" });
  }
});

app.post("/api/db/resolve-task", (req, res) => {
  const { reqId } = req.body;
  const item = dbHelpRequests.find((r) => r.id === reqId);
  if (item) {
    item.status = "resolved";
    res.json({ success: true, request: item });
  } else {
    res.status(404).json({ error: "Help request not found" });
  }
});

app.post("/api/db/log-trip", (req, res) => {
  const { userId, venueId, tripMode, distanceKm } = req.body;
  // Emissions factors source: UK Defra / EPA
  // transit: ~0.04 kg CO2/km, car: ~0.20 kg CO2/km, walk: 0 kg.
  // Saving vs normal single-occupant car trip
  const carEmissions = distanceKm * 0.20;
  let savedEmissions = carEmissions;
  if (tripMode === "transit") {
    savedEmissions = distanceKm * (0.20 - 0.04);
  } else if (tripMode === "rideshare") {
    savedEmissions = distanceKm * (0.20 - 0.10); // Carpool efficiency
  } else if (tripMode === "drive") {
    savedEmissions = 0;
  }
  const log: SustainabilityLog = {
    id: `sust-${Date.now()}`,
    userId: userId || "fan-anon",
    venueId: venueId || "v1",
    tripMode,
    distanceKm: Number(distanceKm) || 0,
    co2SavedKg: Number(savedEmissions.toFixed(2)),
    createdAt: new Date().toISOString(),
  };
  dbSustainabilityLogs.unshift(log);
  res.json({ success: true, log });
});

app.post("/api/db/add-incident", (req, res) => {
  const { venueId, zoneId, type, severity, description, reportedBy } = req.body;
  const inc: Incident = {
    id: `inc-${Date.now()}`,
    venueId: venueId || "v1",
    zoneId: zoneId || "v1-z-1",
    type: type || "other",
    severity: severity || "low",
    status: "active",
    description: description || "No description.",
    reportedBy: reportedBy || "Staff Console",
    createdAt: new Date().toISOString(),
  };
  dbIncidents.unshift(inc);
  res.json({ success: true, incident: inc });
});

app.post("/api/db/resolve-incident", (req, res) => {
  const { incId } = req.body;
  const inc = dbIncidents.find((i) => i.id === incId);
  if (inc) {
    inc.status = "resolved";
    res.json({ success: true, incident: inc });
  } else {
    res.status(404).json({ error: "Incident not found" });
  }
});

app.post("/api/db/add-broadcast", (req, res) => {
  const { venueId, severity, original, translations } = req.body;
  const bc: Broadcast = {
    id: `bc-${Date.now()}`,
    venueId: venueId || "v1",
    severity: severity || "info",
    timestamp: new Date().toISOString(),
    original,
    translations,
  };
  dbBroadcasts.unshift(bc);
  res.json({ success: true, broadcast: bc });
});

// ==========================================
// Lazy-Initialized Gemini SDK Utility
// ==========================================

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Gemini API client initialized successfully.");
    } else {
      console.warn("No active GEMINI_API_KEY found in process.env. AI services will run on simulated high-fidelity mode.");
    }
  }
  return aiClient;
}

// ==========================================
// Gemini API Endpoint Router
// ==========================================

// 1. Multilingual Fan Chat Concierge
app.post("/api/gemini/concierge", async (req, res) => {
  const { message, venueId, currentZoneId, preferredLanguage } = req.body;
  const ai = getAI();

  const userLanguage = preferredLanguage || "English";
  const systemInstruction = `You are Synapse 26's multilingual AI assistant concierge at FIFA World Cup 2026.
The fan is at Venue "${venueId}" and Zone "${currentZoneId || "Zone A"}".
Their preferred language is "${userLanguage}".
Always respond in "${userLanguage}" to make them feel comfortable, even if they typed in another language.
Be helpful, professional, welcoming, and concise.

You have access to 3 stadium tools:
- findNearestAccessibleRestroom(venueId, zoneId): Finds accessible restrooms nearest to current zone.
- getWalkingDirections(fromZoneId, toZoneId): Retrieves safe walking route between concourse zones.
- requestVolunteerAssistance(category, venueId, zoneId, description): Logs assistance for mobility / medical / general.

Whenever the user asks for restrooms, directions, or help/assistance, you MUST call the corresponding tool.
Always append a friendly notice that accessibility escalations go directly to human volunteers.`;

  if (!ai) {
    // Simulation Mode
    setTimeout(() => {
      let reply = "";
      const lower = message.toLowerCase();
      if (lower.includes("restroom") || lower.includes("bathroom") || lower.includes("toilet") || lower.includes("baño")) {
        reply = `I have scanned the local map for you. The nearest accessible restroom is situated in Zone B (East Concourse), right next to Gate 2. This is a step-free facility. Please follow the blue guide signage on the floor.`;
      } else if (lower.includes("direction") || lower.includes("go to") || lower.includes("route") || lower.includes("cómo voy")) {
        reply = `To navigate from your current spot in Zone A to Zone C (South Gate), please take the East Concourse route through Zone B. This bypasses the congested central corridor and takes approximately 4 minutes of step-free walking.`;
      } else if (lower.includes("help") || lower.includes("assistance") || lower.includes("volunteer") || lower.includes("ayuda")) {
        const fakeReqId = `req-sim-${Date.now()}`;
        dbHelpRequests.unshift({
          id: fakeReqId,
          userId: "fan-sim",
          venueId: venueId || "v1",
          zoneId: currentZoneId || "v1-z-1",
          category: "accessibility",
          status: "unassigned",
          description: `AI Concierge auto-logged: ${message}`,
          urgency: "medium",
          createdAt: new Date().toISOString(),
        });
        reply = `I have logged an official support request (Ticket #${fakeReqId}) for you. A volunteer assigned to your current zone has been notified and will arrive shortly to assist you. Please look for staff in neon-green vests!`;
      } else {
        reply = `Welcome to the FIFA World Cup 2026! I am your Synapse 26 concierge. I can find accessible restrooms, provide smart concourse walking directions avoiding heavy crowds, or dispatch a physical volunteer to your seat. How may I assist you today in ${userLanguage}?`;
      }

      // Translate simulation based on preferred language
      if (userLanguage.toLowerCase().startsWith("es")) {
        reply = "¡Hola! " + reply.replace("Welcome", "Bienvenido").replace("restroom", "baño").replace("volunteer", "voluntario");
      } else if (userLanguage.toLowerCase().startsWith("fr")) {
        reply = "Bonjour! " + reply.replace("Welcome", "Bienvenue").replace("restroom", "toilettes").replace("volunteer", "bénévole");
      }

      res.json({ text: reply });
    }, 800);
    return;
  }

  try {
    // Tool definitions for Gemini
    const restroomTool: FunctionDeclaration = {
      name: "findNearestAccessibleRestroom",
      description: "Find the nearest accessible wheelchair-friendly restroom to a specific zone.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          venueId: { type: Type.STRING, description: "The venue ID, e.g. v1" },
          zoneId: { type: Type.STRING, description: "The current zone ID, e.g. v1-z-1" },
        },
        required: ["venueId", "zoneId"],
      },
    };

    const directionsTool: FunctionDeclaration = {
      name: "getWalkingDirections",
      description: "Get smart walking route directions between two zones inside the stadium concourse.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          fromZoneId: { type: Type.STRING, description: "The source zone ID, e.g. v1-z-1" },
          toZoneId: { type: Type.STRING, description: "The target destination zone ID, e.g. v1-z-3" },
        },
        required: ["fromZoneId", "toZoneId"],
      },
    };

    const assistanceTool: FunctionDeclaration = {
      name: "requestVolunteerAssistance",
      description: "Request physically dispatched staff/volunteer assistance at a zone.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Must be accessibility, medical, lost, or general" },
          venueId: { type: Type.STRING, description: "The stadium venue ID, e.g. v1" },
          zoneId: { type: Type.STRING, description: "The exact zone ID, e.g. v1-z-1" },
          description: { type: Type.STRING, description: "A detailed description of the assistance needed" },
        },
        required: ["category", "venueId", "zoneId", "description"],
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [restroomTool, directionsTool, assistanceTool] }],
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let toolResult = "";

      if (call.name === "findNearestAccessibleRestroom") {
        const { zoneId } = call.args as any;
        const targetZone = dbZones.find((z) => z.id === zoneId) || dbZones[0];
        toolResult = `Accessible restroom found directly adjacent to ${targetZone.name} next to Gate 1. It is fully operational and step-free.`;
      } else if (call.name === "getWalkingDirections") {
        const { fromZoneId, toZoneId } = call.args as any;
        const fromZone = dbZones.find((z) => z.id === fromZoneId) || dbZones[0];
        const toZone = dbZones.find((z) => z.id === toZoneId) || dbZones[2];
        const density = toZone.currentDensityPct;
        const congestText = density > 80 ? `Alert: ${toZone.name} is highly congested (${density}%). Consider taking the alternate corridor.` : `Path clear.`;
        toolResult = `Direct route from ${fromZone.name} to ${toZone.name}. ${congestText} Move through the outer ring for an unobstructed 3-minute walk.`;
      } else if (call.name === "requestVolunteerAssistance") {
        const { category, venueId: vId, zoneId: zId, description } = call.args as any;
        const newReq: HelpRequest = {
          id: `req-${Date.now()}`,
          userId: "fan-ai",
          venueId: vId || "v1",
          zoneId: zId || "v1-z-1",
          category: category || "general",
          status: "unassigned",
          description: description || "AI-dispatched helper request",
          urgency: category === "medical" ? "high" : "medium",
          createdAt: new Date().toISOString(),
        };
        dbHelpRequests.unshift(newReq);
        if (supabase) {
          try {
            await supabase.from('help_requests').insert({
              user_id: newReq.userId,
              venue_id: newReq.venueId,
              zone_id: newReq.zoneId,
              category: newReq.category,
              status: newReq.status,
              description: newReq.description,
              urgency: newReq.urgency
            });
          } catch (e) {
            console.error("Failed to insert AI task to Supabase", e);
          }
        }
        toolResult = `Success! Logged assist request ID ${newReq.id}. Support staff has been alerted and is dispatching.`;
      }

      // Re-query Gemini with tool outcome to render final translation
      const followUp = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { role: "user", parts: [{ text: message }] },
          { role: "model", parts: [{ functionCall: { name: call.name, args: call.args, id: call.id } }] },
          { role: "user", parts: [{ text: `Tool result: ${toolResult}. Now reply to the user in ${userLanguage} with appropriate friendly phrasing.` }] },
        ],
        config: { systemInstruction },
      });

      res.json({ text: followUp.text });
    } else {
      res.json({ text: response.text });
    }
  } catch (err: any) {
    console.error("Gemini Concierge API error: ", err);
    res.status(500).json({ error: "Gemini server error", details: err.message });
  }
});

// 2. Staff Copilot & Stadium Policy Q&A
app.post("/api/gemini/copilot", async (req, res) => {
  const { query, venueId } = req.body;
  const ai = getAI();

  const contextStr = VENUE_POLICIES.map((p) => `- For "${p.topic}": ${p.policy}`).join("\n");
  const venueZones = dbZones.filter((z) => z.venueId === (venueId || "v1"));
  const venueGates = dbGates.filter((g) => g.venueId === (venueId || "v1"));
  const currentIncidents = dbIncidents.filter((i) => i.venueId === (venueId || "v1") && i.status === "active");

  const systemInstruction = `You are the Synapse 26 Command Center Operational Intelligence Copilot.
Here is the live stadium context for Venue "${venueId}":
- Zones Density: ${JSON.stringify(venueZones.map((z) => ({ name: z.name, densityPct: z.currentDensityPct })))}
- Gates Occupancy: ${JSON.stringify(venueGates.map((g) => ({ name: g.name, occupancy: g.currentOccupancy, capacity: g.capacity })))}
- Active Operational Incidents: ${JSON.stringify(currentIncidents)}

Here are official Venue Policies for Grounding:
${contextStr}

Your Job:
1. Answer Q&A from volunteers or venue staff regarding policies or status.
2. If the user asks about something NOT in the grounded policies, do NOT make up rules. Explicitly state: "I don't have that policy in my database, please check with your section supervisor."
3. If they ask about bottlenecks or crowd recommendations, analyze the density/occupancy above. CITE the actual numbers in your answer (e.g. "Zone C is at 88%").
4. Provide actionable suggestions (e.g. "recommend opening overflow Gate 4"). Keep it highly objective, data-driven, and brief.`;

  if (!ai) {
    // Simulation Mode
    setTimeout(() => {
      let reply = "";
      const lower = query.toLowerCase();
      if (lower.includes("bottle") || lower.includes("water")) {
        reply = `According to official stadium rules: Fans can bring one unopened plastic bottle of water up to 20oz. Metal, insulated, or glass bottles are banned.`;
      } else if (lower.includes("reentry") || lower.includes("re-entry")) {
        reply = `Stadium policy strictly prohibits re-entry for security. Once a fan exits the gates, they cannot re-enter on the same ticket.`;
      } else if (lower.includes("bag") || lower.includes("backpack")) {
        reply = `The clear bag policy allows clear plastic bags up to 12" x 6" x 12". Backpacks, non-clear duffels, and large purses are prohibited.`;
      } else if (lower.includes("slowdown") || lower.includes("bottleneck") || lower.includes("congested") || lower.includes("crowd")) {
        const highZone = venueZones.find((z) => z.currentDensityPct > 80);
        if (highZone) {
          reply = `Current Operational intelligence indicates a congestion warning at **${highZone.name}**, currently running at **${highZone.currentDensityPct}% density**. I recommend opening Gate 1 (currently at ${venueGates[0].currentOccupancy} occupancy) to full flow and deploying 2 additional volunteers to assist with redirection.`;
        } else {
          reply = `All zones are currently operating within nominal parameters (average density ~45%). No crowd bottlenecks detected.`;
        }
      } else {
        reply = `I don't have that policy in my database. Please coordinate with your section supervisor for official instructions regarding "${query}".`;
      }
      res.json({ text: reply });
    }, 800);
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: query,
      config: { systemInstruction },
    });
    res.json({ text: response.text });
  } catch (err: any) {
    res.status(500).json({ error: "Gemini server error", details: err.message });
  }
});

// 3. Multilingual Broadcast Translator & Optimizer
app.post("/api/gemini/translate-broadcast", async (req, res) => {
  const { originalMessage, severity, venueId } = req.body;
  const ai = getAI();

  const systemInstruction = `You are a professional safety translator at FIFA World Cup 2026.
Given a raw operational warning from stadium management, you MUST generate four parallel outputs, in three host languages: English (en), Spanish (es), French (fr).

Output structure must be a structured JSON object containing:
{
  "en": {
    "pa": "Calm, slow, staff-read public announcement script.",
    "push": "A high-impact short push notification under 140 chars.",
    "caption": "Accurate captioned text for hearing-impaired displays.",
    "simple": "Simplified plain-language for cognitive accessibility (simple sentences, easy vocabulary)."
  },
  "es": { ... },
  "fr": { ... }
}

Ensure high translation accuracy, appropriate professional tone, and strict JSON format compliance matching the requested schema.`;

  if (!ai) {
    // Simulation Mode
    setTimeout(() => {
      res.json({
        en: {
          pa: `Attention fans: ${originalMessage}. Please proceed calmly and follow instructions.`,
          push: `Alert: ${originalMessage.substring(0, 100)}`,
          caption: `[Announcement] ${originalMessage}`,
          simple: `Take care: ${originalMessage}. Please walk slowly.`
        },
        es: {
          pa: `Atención aficionados: ${originalMessage}. Por favor procedan con calma.`,
          push: `Aviso: ${originalMessage.substring(0, 100)}`,
          caption: `[Anuncio] ${originalMessage}`,
          simple: `Atención: ${originalMessage}. Camine con cuidado.`
        },
        fr: {
          pa: `Attention supporters: ${originalMessage}. Veuillez rester calmes et suivre les consignes.`,
          push: `Alerte: ${originalMessage.substring(0, 100)}`,
          caption: `[Annonce] ${originalMessage}`,
          simple: `Attention: ${originalMessage}. Veuillez marcher lentement.`
        }
      });
    }, 1000);
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Translate and structure this stadium warning: "${originalMessage}" with severity level: "${severity}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            en: {
              type: Type.OBJECT,
              properties: {
                pa: { type: Type.STRING },
                push: { type: Type.STRING },
                caption: { type: Type.STRING },
                simple: { type: Type.STRING },
              },
              required: ["pa", "push", "caption", "simple"],
            },
            es: {
              type: Type.OBJECT,
              properties: {
                pa: { type: Type.STRING },
                push: { type: Type.STRING },
                caption: { type: Type.STRING },
                simple: { type: Type.STRING },
              },
              required: ["pa", "push", "caption", "simple"],
            },
            fr: {
              type: Type.OBJECT,
              properties: {
                pa: { type: Type.STRING },
                push: { type: Type.STRING },
                caption: { type: Type.STRING },
                simple: { type: Type.STRING },
              },
              required: ["pa", "push", "caption", "simple"],
            },
          },
          required: ["en", "es", "fr"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: "Gemini parser failure", details: err.message });
  }
});

// 4. Forecast and Post-Match Report Generation
app.post("/api/gemini/post-match-report", async (req, res) => {
  const { venueId } = req.body;
  const ai = getAI();

  const venue = dbVenues.find((v) => v.id === venueId) || dbVenues[0];
  const reportData = {
    venueName: venue.name,
    city: venue.city,
    incidentsCount: dbIncidents.length,
    incidentsList: dbIncidents,
    helpRequestsResolved: dbHelpRequests.filter((h) => h.status === "resolved").length,
    helpRequestsTotal: dbHelpRequests.length,
    sustainabilityCO2Saved: dbSustainabilityLogs.reduce((acc, l) => acc + l.co2SavedKg, 0),
    matchInfo: dbMatches.find((m) => m.venueId === venueId) || dbMatches[0],
  };

  const systemInstruction = `You are a lead executive officer at FIFA World Cup 2026.
Generate a comprehensive, professionally styled Post-Match Operational debriefing report in Markdown format.
Focus on operational efficiency, crowd flows, medical/accessibility requests dispatched, green sustainability transportation scores, and key recommendations.
Make sure the tone is official, authoritative, data-driven, and optimistic.`;

  if (!ai) {
    // Simulation Mode
    setTimeout(() => {
      const markdown = `# FIFA World Cup 2026 - Post-Match Operational Report
**Venue:** ${venue.name} (${venue.city}, ${venue.country})
**Reporting Cycle:** Matchday operational checkout

## 1. Executive Summary
The stadium successfully managed a peak capacity match with total logistics coordination. 

## 2. Crowd Management & Logistics
- **Peak Gate Flow:** Arriving crowd flow peaked at T-45 minutes.
- **Incident Interventions:** Managed ${reportData.incidentsCount} crowd density warnings and safety events.
- **Volunteer Dispatches:** Logged ${reportData.helpRequestsTotal} accessibility & medical assistance dispatches. ${reportData.helpRequestsResolved} were successfully resolved by green-vest teams.

## 3. Sustainability Outcomes
- **CO2 Offset:** Saved a cumulative **${reportData.sustainabilityCO2Saved.toFixed(1)} kg of CO2** via public transit coordination and active green rewards.

## 4. Key Recommendations for Next Match
1. Re-position 15 additional volunteers to Gate 1 accessible ramp.
2. Activate advisory zone bulletins 15 minutes earlier to alleviate South Gate bottlenecks.
3. Optimize rideshare drop-off zone shuttle frequencies.

---
*Report compiled automatically by Synapse 26 Operational Intelligence.*`;
      res.json({ markdown });
    }, 1000);
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a full Markdown post-match report with this data: ${JSON.stringify(reportData)}`,
      config: { systemInstruction },
    });
    res.json({ markdown: response.text });
  } catch (err: any) {
    res.status(500).json({ error: "Gemini server error", details: err.message });
  }
});

// ==========================================
// Vite Middleware & Front-end Integration
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Synapse 26 Server running on http://localhost:${PORT}`);
  });
}

startServer();
